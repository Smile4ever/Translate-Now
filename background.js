/// Static variables
let selectedText = "";
let globalAction = "";
let lastTabs = [];

// Feature discovery
let useOpenerTabId = true;
let browserInfoAvailable = true;
let android = false;
let firefoxAndroid = false;

//the addons icon is a modified version of http://www.flaticon.com/free-icon/translator-tool_69101
//see their website for licensing information

let initDone = false;
let translate_now_destination_language;
let translate_now_source_language;
let translate_now_reuse_tab;
let translate_now_reuse_tab_all;
let translate_now_related_tabs;
let translate_now_translate_engine;
let translate_now_google_speak_audio_only;
let translate_now_to_speak;
let translate_now_context_selection;
let translate_now_context_page;
let translate_now_context_link;

let translate_now_show_deepl_translator;
let translate_now_show_bing_translator;
let translate_now_show_google_translate;

let translate_now_show_google_translate_voice;
let translate_now_show_bing_translator_voice;
let translate_now_show_deepl_translator_voice;

async function init(){
	let valueOrDefault = function(value, defaultValue){
		return value == undefined ? defaultValue : value;
	}

	let result = await browser.storage.local.get([
		"translate_now_destination_language",
		"translate_now_source_language",
		"translate_now_reuse_tab",
		"translate_now_reuse_tab_all",
		"translate_now_related_tabs",
		"translate_now_translate_engine",
		"translate_now_google_speak_audio_only",
		"translate_now_to_speak",
		"translate_now_context_selection",
		"translate_now_context_page",
		"translate_now_context_link",
		"translate_now_show_deepl_translator",
		"translate_now_show_bing_translator",
		"translate_now_show_google_translate",
		"translate_now_show_google_translate_voice",
		"translate_now_show_bing_translator_voice",
		"translate_now_show_deepl_translator_voice"
	]);
	
	translate_now_destination_language = valueOrDefault(result.translate_now_destination_language, "auto");
	if(translate_now_destination_language == "auto"){
		if(navigator.language != "" && navigator.language != null){
			translate_now_destination_language = navigator.language;
		}else{
			translate_now_destination_language = "en";
		}
	}
	
	translate_now_source_language = valueOrDefault(result.translate_now_source_language, "auto");
	translate_now_reuse_tab = valueOrDefault(result.translate_now_reuse_tab, true);
	translate_now_reuse_tab_all = valueOrDefault(result.translate_now_reuse_tab_all, false);
	translate_now_related_tabs = valueOrDefault(result.translate_now_related_tabs, true);
	translate_now_enable_speak = valueOrDefault(result.translate_now_enable_speak, false);
	translate_now_translate_engine = valueOrDefault(result.translate_now_translate_engine, "google");
	translate_now_google_speak_audio_only = valueOrDefault(result.translate_now_google_speak_audio_only, false);
	translate_now_to_speak = valueOrDefault(result.translate_now_to_speak, "both");
	translate_now_context_selection = valueOrDefault(result.translate_now_context_selection, true);
	translate_now_context_page = valueOrDefault(result.translate_now_context_page, true);
	translate_now_context_link = valueOrDefault(result.translate_now_context_link, true);

	translate_now_show_deepl_translator = valueOrDefault(result.translate_now_show_deepl_translator, false);
	translate_now_show_bing_translator = valueOrDefault(result.translate_now_show_bing_translator, false);
	translate_now_show_google_translate = valueOrDefault(result.translate_now_show_google_translate, true);

	translate_now_show_google_translate_voice = valueOrDefault(result.translate_now_show_google_translate_voice, false);
	translate_now_show_bing_translator_voice = valueOrDefault(result.translate_now_show_bing_translator_voice, false);
	translate_now_show_deepl_translator_voice = valueOrDefault(result.translate_now_show_deepl_translator_voice, false);

	await initPlatform();
	await initContextMenus();

	function format(translate_engine){
		if(translate_engine == "google") return "Google Translate";
		if(translate_engine == "bing") return "Bing Translator";
		if(translate_engine == "deepl") return "DeepL Translator";
	}

	browser.action.setTitle({title: "Translate Now - " + format(translate_now_translate_engine)});
	initDone = true;
}
init();

///Messages
// listen for messages from the content or options script
browser.runtime.onMessage.addListener(function(message) {
	switch (message.action) {
		case "refresh-options":
			init();
			break;
		case "setSelection":
			setSelection(message.data.selection, message.data.pageUrl);
			break;
		case "notify":
			notify(message.data);
			break;
		case "log":
			//console.log("translatenow.js: received from content script: " + message.data);
			break;
		case "logOptions":
			//console.log("translatenow.js: received from options script: " + message.data);
			break;
		default:
			break;
	}
});

// See also https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/Tabs/sendMessage
async function sendMessage(action, data, errorCallback){
	let tabs = await browser.tabs.query({currentWindow: true, active: true});
	for (tab of tabs) {
		browser.tabs.sendMessage(tab.id, {"action": action, "data": data}).catch(function(){
			console.error("Sendmessage failed, check the content script for syntax errors or check the addon permissions in Firefox. Action: " + action + " to " + tab.url + " with data " + JSON.stringify(data));
			notify("Sending message " + action + " failed, check the addon permissions in Firefox");
			if(errorCallback) errorCallback(data, tab.url);
		});
	}
}

/// Init (platform info, context menus)
async function initPlatform(){
	if(browser.runtime.getBrowserInfo == null){
		browserInfoAvailable = false;
	}

	let platformInfo = await browser.runtime.getPlatformInfo();
	let browserInfo = await browser.runtime.getBrowserInfo();
	if(platformInfo.os == "android"){
		android = true;
		if(browserInfo.name.includes("Firefox")){
			firefoxAndroid = true;
			useOpenerTabId = false;
		}
	}
}

async function initContextMenus(){
	if(browser.contextMenus == undefined) return;

	browser.contextMenus.removeAll();

	let selectionPageContext = [];
	let selectionContext = [];

	if(translate_now_context_selection)	selectionPageContext.push("selection");
	if(translate_now_context_selection)	selectionContext.push("selection");
	if(translate_now_context_page) selectionPageContext.push("page");
	if(translate_now_context_link) selectionPageContext.push("link");

	if(translate_now_show_bing_translator)
		createContextMenu("translatenow-bing-translate", "Translate with Bing", selectionContext, "icons/engines/bing.png");
	if(translate_now_show_deepl_translator)
		createContextMenu("translatenow-deepl-translate", "Translate with DeepL", selectionContext, "icons/engines/deepl.png");
	if(translate_now_show_google_translate)
		createContextMenu("translatenow-google-translate", "Translate with Google", selectionPageContext, "icons/engines/google.png");
	
	//if(translate_now_show_bing_translator_voice)
	//	createContextMenu("translatenow-bing-speak", "Speak with Bing Translator Voice", selectionContext, "icons/engines/bing.png");
	//if(translate_now_show_deepl_translator_voice)
	//	createContextMenu("translatenow-deepl-speak", "Speak with Deepl Translator Voice", selectionContext, "icons/engines/deepl.png");
	//if(translate_now_show_google_translate_voice)
	//	createContextMenu("translatenow-google-speak", "Speak with Google Translate Voice", selectionContext, "icons/engines/google.png");
}

function createContextMenu(id, title, contexts, icon64){
	if(icon64 != null && browserInfoAvailable){
		browser.contextMenus.create({
			id: id,
			title: title,
			contexts: contexts,
			icons: {
				"64": browser.runtime.getURL(icon64)
			},
			documentUrlPatterns: ["http://*/*", "https://*/*"]
		});
	}else{
		browser.contextMenus.create({
			id: id,
			title: title,
			contexts: contexts,
			documentUrlPatterns: ["http://*/*", "https://*/*"]
		});
	}
}

async function listener(info, tab){
	if(initDone == false) await init();
	
	if(info.menuItemId == "translatenow-tb-preferences"){
		browser.runtime.openOptionsPage();
		return;
	}

	let selectionText = "";
	let pageUrl = "";

	// Don't fill pageUrl when we won't be using it.
	if(info.selectionText != "" && info.selectionText != null){
		selectionText = info.selectionText;
	}else{
		if(info.pageUrl != "" && info.pageUrl != null)
			pageUrl = info.pageUrl;

		if(info.linkUrl != "" && info.linkUrl != null)
			pageUrl = info.linkUrl;
	}
	
	doClick(selectionText, pageUrl, info.menuItemId.replace("translatenow-", ""));
}

browser.contextMenus.onClicked.removeListener(listener);
browser.contextMenus.onClicked.addListener(listener);

async function clickToolbarButton(){
	if(initDone == false) await init();

	if(translate_now_translate_engine != null){
		globalAction = translate_now_translate_engine + "-translate";

		// selectionText is unknown at this point, so pass an empty string
		sendMessage("getSelection", "", priviledgedSiteNoContentScript);
	}
}

browser.action.onClicked.addListener(clickToolbarButton);

async function openTab(url){
	if(lastTabs.length > 0 && translate_now_reuse_tab){
		let toBeOpenedHostname = new URL(url).hostname;

		// Look for tabs in lastTabs where hostname is equal to the to-be-opened one
		// when translate_now_reuse_tab_all is set to true, it will overwrite this again
		let lastTabPromises = lastTabs.map(lastTab => browser.tabs.get(lastTab.id));

		let tabs = await Promise.all(lastTabPromises);
		let equalTabs = tabs.filter(function currentHostnameMatchesToBeOpened(tab) {
			return new URL(tab.url).hostname == toBeOpenedHostname;
		});

		if(translate_now_reuse_tab_all){
			equalTabs = tabs;
		}

		if(equalTabs.length > 0){
			let lastEqualTab = equalTabs.pop();
			browser.tabs.update(lastEqualTab.id, {
				active: true,
				url: url
			});
			browser.windows.update(lastEqualTab.windowId, {
				focused: true
			});
			
		}else{
			openFocusedTab(url);
		}

	}else{
		openFocusedTab(url);
	}
}

async function openFocusedTab(url){
	let tabs = await browser.tabs.query({currentWindow: true, active: true});
	let createProperties = {
		url: url,
		active: true
	};

	if(translate_now_related_tabs && useOpenerTabId){
		createProperties.openerTabId = tabs[0].id;
	}

	let tab = await browser.tabs.create(createProperties);
	// tab.url is about:blank at the creation time, use "url" variable instead
	lastTabs.push({id: tab.id, url: url});
}

browser.tabs.onRemoved.addListener((tabId, removeInfo) => {
	// Remove closed tabs from the lastTabs array
	lastTabs = lastTabs.filter(lastTab => lastTab.id != tabId);
});

function doClick(selectionText, pageUrl, action){
	globalAction = action;

	// Ideally, we want to use selectionText this which also works for cross-domain iframes (nice!!)
	// But we now use a content script if the selection is too long to circumvent https://bugzilla.mozilla.org/show_bug.cgi?id=1338898

	if(pageUrl != "" || (selectionText.length > 0 && selectionText.length != 16384))
		doAction(selectionText, pageUrl, action);
	else
		sendMessage("getSelection", selectionText, priviledgedSiteNoContentScript);
}

function priviledgedSiteNoContentScript(selectionText, pageUrl){
	// We are probably on addons.mozilla.org or another priviledged website	
	// Best effort support for addons.mozilla.org among other websites
	doAction(selectionText, pageUrl, globalAction);
}

function isTranslationPage(pageUrl){
	return pageUrl.includes(".translate.goog") || pageUrl.includes("://www.deepl.com") || pageUrl.includes("://www.bing.com/translator");
}

function isInvalidPage(pageUrl){
	return pageUrl.startsWith("https:") == false && pageUrl.startsWith("http://") == false;
}

function doAction(selectionText, pageUrl, action){
	let isURL = false;
	if(selectionText != "" && selectionText != null){
		selectedText = selectionText;
		// If user opted to show the context menu for translating links,
		// check if the selection is a valid URL, if so translate as link
		if(translate_now_context_link && /^\s*https?:\/\/\S+\s*$/i.test(selectedText)){
			try{
				selectedText = new URL(selectedText.trim()).href;
				isURL = true;
			}catch(e){}
		}
	}else{
		if(pageUrl != "" && pageUrl != null){
			if(isTranslationPage(pageUrl) || isInvalidPage(pageUrl)){
				notify("This page cannot be translated, opening a new translation page.");
				selectedText = "";
				isURL = false;
			}else{
				if(action == "bing-translate"){
					notify("Bing cannot translate whole pages, using Google Translate instead.");
				}
				if(action == "deepl-translate"){
					notify("DeepL cannot translate whole pages, using Google Translate instead.");
				}
				
				if(action == "bing-translate" || action == "deepl-translate"){
					globalAction = "google-translate";
					action = "google-translate";
				}
				selectedText = pageUrl;
				isURL = true;
			}
		}else{
			notify("Please try another selection.");
			return;
		}
	}
	
	if(selectedText.length > 1500 && action.includes("deepl") && action.includes("translate")){
		notify("Selected text is too long. Only the first 1500 selected characters will be translated.");
	}
	
	if(selectedText.length > 5000 && action.includes("deepl") == false && action.includes("translate")){
		notify("Selected text is too long. Only the first 5000 selected characters will be translated.");
	}
	
	let newText = getNewText(selectedText);

	if(action == "google-speak"){
		if(selectedText.length > 195){
			notify("Selected text is too long. Only the first 195 characters will be spoken.");
		}
			
		if(translate_now_google_speak_audio_only){
			if(translate_now_source_language == "auto") translate_now_source_language = "en";
			let newTextSpeak = getNewTextSpeak(selectedText);
			openTab(googletranslate.getSpeakUrlSource(translate_now_source_language, newTextSpeak)); // Since we are not translating anything, use the source language
		}else{
			// Using HTTP instead of HTTPS, to trigger Firefox HTTP -> HTTPS redirect. Otherwise, the old text is retained. See bug 18. https://github.com/Smile4ever/firefoxaddons/issues/18
			//openTab("http://translate.google.com/#" + translate_now_source_language + "/" + translate_now_destination_language + "/" + newText);
			// Use new URL structure, see bug 156. https://github.com/Smile4ever/firefoxaddons/issues/156
			openTab("http://translate.google.com/?sl=" + translate_now_source_language + "&tl=" + translate_now_destination_language + "&text=" + newText + "&op=translate");
			
			browser.tabs.onUpdated.addListener(pageLoaded);
			setTimeout(function(){
				// Remove the listener when the page fails to load within 5 seconds
				browser.tabs.onUpdated.removeListener(pageLoaded);
			}, 5000);
		}
	}
	
	if(action == "google-translate"){
		if(isURL){
			//openTab("https://translate.google.com/translate?sl=" + translate_now_source_language + "&tl=" + translate_now_destination_language + "&js=y&prev=_t&ie=UTF-8&u=" + newText);
			openTab("https://translate.google.com/translate?hl=" + translate_now_source_language + "&sl=" + translate_now_source_language + "&tl=" + translate_now_destination_language + "&u=" + newText);
		}else{
			// Using HTTP instead of HTTPS, to trigger Firefox HTTP -> HTTPS redirect. Otherwise, the old text is retained. See bug 18. https://github.com/Smile4ever/firefoxaddons/issues/18
			//openTab("http://translate.google.com/#" + translate_now_source_language + "/" + translate_now_destination_language + "/" + newText);
			// Use new URL structure, see bug 156. https://github.com/Smile4ever/firefoxaddons/issues/156
			openTab("http://translate.google.com/?sl=" + translate_now_source_language + "&tl=" + translate_now_destination_language + "&text=" + newText + "&op=translate");
		}
	}
	
	if(action.includes("bing")){
		openTab("https://www.bing.com/translator");
		browser.tabs.onUpdated.addListener(pageLoaded);
		setTimeout(function(){
			// Remove the listener when the page fails to load within 5 seconds
			browser.tabs.onUpdated.removeListener(pageLoaded);
		}, 5000);
	}

	if(action.includes("deepl")){
		//let sourceLanguage = translate_now_source_language == "auto" ? "en" : translate_now_source_language;
		openTab("https://www.deepl.com/translator#" + translate_now_source_language + "/" + translate_now_destination_language + "/" + newText);

		if(action == "deepl-speak"){
			sendMessage("deeplSpeak", {
				translate_now_source_language: translate_now_source_language,
				translate_now_destination_language: translate_now_destination_language,
				selectedText: selectedText,
				translate_now_to_speak: translate_now_to_speak
			});
		}
	}
}

function pageLoaded(tabId, changeInfo, tabInfo){
	if(tabInfo.status != "complete" || tabInfo.status == "interactive") return;
	
	if(tabInfo.url.includes("https://www.bing.com/translator")){
		if(globalAction == "bing-translate"){
			sendMessage("bingTranslate", {
				translate_now_source_language: translate_now_source_language,
				translate_now_destination_language: translate_now_destination_language,
				selectedText: selectedText
			});
		}
		if(globalAction == "bing-speak"){
			sendMessage("bingSpeak", {
				translate_now_source_language: translate_now_source_language,
				translate_now_destination_language: translate_now_destination_language,
				selectedText: selectedText,
				translate_now_to_speak: translate_now_to_speak
			});
		}
		
		browser.tabs.onUpdated.removeListener(pageLoaded);
	}

	// HTTP -> HTTPS redirect
	if(tabInfo.url.includes("translate.goog")){
		if(globalAction == "google-speak")
			sendMessage("googleSpeak", {
				translate_now_source_language: translate_now_source_language,
				translate_now_destination_language: translate_now_destination_language,
				translate_now_to_speak: translate_now_to_speak
			});
		browser.tabs.onUpdated.removeListener(pageLoaded);
	}
}

function setSelection(selectionText, pageUrl){
	doAction(selectionText, pageUrl, globalAction);
}

function getNewText(text){
	let newText = text;
	newText = encodeURIComponent(newText);
	newText = newText.replace("%25", "");
	newText = newText.replace("%C2%A0", " ");
	
	return newText;
}

function getNewTextSpeak(text){
	let newText = getNewText(text.substring(0, 195));
	
	return newText;
}

/// Helper functions
function notify(message){
	let messageId = message.substring(0, 20).replace(" ", "");
	browser.notifications.create(messageId,
	{
		type: "basic",
		iconUrl: browser.runtime.getURL("icons/translatenow-64.png"),
		title: "Translate Now",
		message: message
	});
	setTimeout(function(){
		browser.notifications.clear(messageId);
	}, 5000);
}
