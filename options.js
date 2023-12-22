const PREFS = {
	"translate_now_destination_language": {
		"type": "value",
		"default": "en"
	},
	"translate_now_source_language": {
		"type": "value",
		"default": "auto"
	},
	"translate_now_reuse_tab": {
		"type": "checked",
		"default": true
	},
	"translate_now_reuse_tab_all": {
		"type": "checked",
		"default": false
	},
	"translate_now_related_tabs": {
		"type": "checked",
		"default": true
	},
	"translate_now_translate_engine": {
		"type": "value",
		"default": "google"
	},
	"translate_now_show_deepl_translator": {
		"type": "checked",
		"default": false
	},
	"translate_now_show_bing_translator": {
		"type": "checked",
		"default": false,
	},
	"translate_now_show_google_translate": {
		"type": "checked",
		"default": true
	},
	"translate_now_show_google_translate_voice": {
		"type": "checked",
		"default": false
	},
	"translate_now_show_bing_translator_voice": {
		"type": "checked",
		"default": false
	},
	"translate_now_show_deepl_translator_voice": {
		"type": "checked",
		"default": false
	},
	"translate_now_google_speak_audio_only": {
		"type": "checked",
		"default": false
	},
	"translate_now_to_speak": {
		"type": "value",
		"default": "both"
	},
	"translate_now_context_selection": {
		"type": "checked",
		"default": true
	},
	"translate_now_context_page": {
		"type": "checked",
		"default": true
	},
	"translate_now_context_link": {
		"type": "checked",
		"default": true
	}
};

function sendMessage(action, data){
	browser.runtime.sendMessage({"action": action, "data": data});
}

async function saveOptions() { 
	sendMessage("notify", "Saved preferences");
	
	const values = {};
	for(let p in PREFS) {
		let element = document.getElementById(p);
		values[p] = element[PREFS[p].type];
	}

	await browser.storage.local.set(values);
	sendMessage("refresh-options");
}

async function restoreOptions() {
	let result = await browser.storage.local.get(Object.keys(PREFS));

	let val;
	for(let p in PREFS) {
		if(p in result) {
			val = result[p];
		}
		else {
			val = PREFS[p].default;
		}
		document.getElementById(p)[PREFS[p].type] = val;
	}
}

function translateEngineChangedEvent(event){
	if(!event.target.value) return;
	translateEngineChangedValue(event.target.value);
}

function translateEngineChangedValue(value){
	if(!value) return;

	updateSupportedLanguages(value, "translate_now_destination_language");
	updateSupportedLanguages(value, "translate_now_source_language");
}

function translateEngineInit(){
	translateEngineChangedValue(translate_now_translate_engine.options[translate_now_translate_engine.selectedIndex].value);
	document.getElementById("translate_now_translate_engine").addEventListener("change", translateEngineChangedEvent);
}

function updateSupportedLanguages(value, id){
	let languages = document.getElementById(id).getElementsByTagName("option");

	for(let lang of languages){
		let c = lang.getAttribute("class");
		if(c == null) c = "";

		if(value == "deepl" && c.indexOf("deepl") == -1){
			lang.style.display = "none";
			continue;
		}

		lang.style.display = "block";
	}
}

async function initPlatform(){
	let platformInfo = await browser.runtime.getPlatformInfo();
	
	if(platformInfo.os == "android"){
		let elements = document.querySelectorAll(".non-android");

		for(let element of elements){
			element.style.display = "none";
		}
	}
}

async function init(){
	await restoreOptions();
	await initPlatform();
	translateEngineInit();

	document.querySelector("form").style.display = "block";
	document.querySelector(".refreshOptions").style.display = "none";
}

window.addEventListener("DOMContentLoaded", init, { passive: true });
document.querySelector("form").addEventListener("submit", (e) => { e.preventDefault(); saveOptions(); }, { passive: false });
