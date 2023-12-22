// Listen for messages from the background script
browser.runtime.onMessage.addListener((message) => {
	//console.log("translatenow.js: received message from background script " + message.action);
	//console.log("translatenow.js: received data from background script " + JSON.stringify(message.data));

	switch(message.action){
		case "getSelection":
			sendMessage("setSelection", {selection: getSelection(message.data), pageUrl: window.location.href});
			//return Promise.resolve({selection: getSelection(message.data), pageUrl: window.location.href});
			break;
		case "bingTranslate":
			bingTranslate(message.data.translate_now_source_language, message.data.translate_now_destination_language, message.data.selectedText);
			break;
		case "bingSpeak":
			bingSpeak(message.data.translate_now_source_language, message.data.translate_now_destination_language, message.data.selectedText, message.data.translate_now_to_speak);
			break;
		case "googleSpeak":
			googleSpeak(message.data.translate_now_source_language, message.data.translate_now_destination_language, message.data.translate_now_to_speak);
			break;
		case "deeplSpeak":
			deeplSpeak(message.data.translate_now_source_language, message.data.translate_now_destination_language, message.data.selectedText, message.data.translate_now_to_speak);
			break;
		default:
			break;
	}
});

function sendMessage(action, data){
	browser.runtime.sendMessage({"action": action, "data": data});
}

function getSelection(safeSelection) {
	let inputSel = getInputSelection(document);
	if(inputSel != "") return inputSel;
	
	let normalSelection = window.getSelection().toString();
	if(normalSelection != "") return normalSelection;
	
	/// Code from Get Archive
	// Test URL: https://archive.is/2013.07.03-031317/http://neppi.blog.shinobi.jp/ねっぴーのこと/恩師増田宏三先生を悼む	
	let frameIdentifiers = ["iframe", "frame"];
	try{
		let i = 0;
		for(i = 0; i < frameIdentifiers.length; i++){
			let frames = document.getElementsByTagName(frameIdentifiers[i]);
			//console.log("number of frames: " + frames.length);
			
			let j = 0;
			for(j = 0; j < frames.length; j++){
				let frame = frames[j];

				let result = getIframeText(frame, window.location.href);
				if(result == "continue") continue;
				if(result != "exit") return result;
				
				for(k = 0; k < frameIdentifiers.length; k++){
					let innerFrames = frame.getElementsByTagName(frameIdentifiers[k]);
					
					for(l = 0; l < innerFrames.length; l++){
						let innerFrame = innerFrames[l];
						
						let result = getIframeText(innerFrame, frame.baseURI);
						if(result == "continue") continue;
						if(result != "exit") return result;
					}
				}
			}	
		}
	}catch(ex){
		// I don't trust the code above, return the default value at all times when there is an error with the code above
		console.log("Exception while getting the selection text from the frame: " + ex);
	}
	/// End of code from Get Archive
	
    return safeSelection;
}

function getIframeText(frame, parent){
	//console.log("baseURI: " + frame.document.baseURI + " parent is " + parent);
	try{		
		let doc = frame.document || frame.contentWindow || frame.contentDocument;

		let frameselection = doc.getSelection();
		
		if(frameselection == null){
			inputSel = getInputSelection(doc);
			if(inputSel != ""){
				return inputSel;
			}else{
				return "continue";
			}
		}else if(frameselection.toString().length > 0){
			//console.log("translatenow.js returning (i)frame selection");
			return frameselection.toString();
		}
		
		return "exit";
	}catch(innerex){
		//console.log("innerex " + innerex);
		//console.log("CROSS-DOMAIN IFRAME on URL " + frame.getAttribute("src"));
		return "exit";
	}
}

function getInputSelection(doc){
	try{
		if(doc.activeElement != null && (doc.activeElement.tagName === "TEXTAREA" || doc.activeElement.tagName === "INPUT")) {
			let inputSelectedText = doc.activeElement.value.substring(doc.activeElement.selectionStart, doc.activeElement.selectionEnd);
			if(inputSelectedText != null && inputSelectedText != ""){
				return inputSelectedText;
			}
		}
	}catch(ex){
		// I don't trust the code above, make sure we return an empty string so returning window.getSelection() will still work in the calling function
		return "";
	}
	return "";
}

function bingTranslate(translate_now_source_language, translate_now_destination_language, selectedText){
	sendMessage("log, bing src language " + translate_now_source_language);
	setBingLanguage("tta_srcsl", translate_now_source_language.replace("auto", "auto-detect"));
	
	sendMessage("log, bing dest language " + translate_now_destination_language);
	setBingLanguage("tta_tgtsl", translate_now_destination_language);
	
	let realDocument = document;
	setTimeout(function(){
		var textArea = realDocument.getElementById("tta_input_ta");
		textArea.value = selectedText;

		// Hack, but it works
		var suggestion = realDocument.querySelector(".tt_phTd");
		suggestion.textContent = selectedText;
		suggestion.click();
	}, 200);
}

function setBingLanguage(className, value){
	let select = document.getElementById(className);

	let options = select.getElementsByTagName("option");
	let i = 0;

    for(let item of options){
		if(item.value == value){
			select.selectedIndex = i;
			break;
		}
		i++;
	}
}

function bingSpeak(translate_now_source_language, translate_now_destination_language, selectedText, translate_now_to_speak){
	bingTranslate(translate_now_source_language, translate_now_destination_language, selectedText);
	
	setTimeout(function(){
		switch(translate_now_to_speak){
			case "original":
				bingSpeakSource();
				break;
			case "translation":
				bingSpeakDestination();
				break;
			case "both":
				setTimeout(function(){
					bingSpeakSource();
				}, 700);
				
				let length = 85 * selectedText.length;

				setTimeout(function(){
					if(document.getElementById("tta_input_ta").value != document.getElementById("tta_output_ta").value)
						bingSpeakDestination();
				}, length);
				
				break;
			default:
				break;
		}
	}, 3000);
}

//   document.querySelector("button[data-testid='translator-speaker-target']").click() 
function deeplSpeak(translate_now_source_language, translate_now_destination_language, selectedText, translate_now_to_speak){
	sendMessage("log", "translate_now_to_speak is " + translate_now_to_speak);
	
	switch(translate_now_to_speak){
		case "original":
			deeplSpeakOriginal(translate_now_source_language);
			break;
		case "translation":
			deeplSpeakTranslation(translate_now_destination_language);
			break;
		case "both":
			let result1 = deeplSpeakOriginal(translate_now_source_language);
			let result2 = deeplSpeakTranslation(translate_now_destination_language);
			if(result1 == false && result2 == false){
				sendMessage("notify", "Both - DeepL Translator Voice does not support other languages than English");
			}

			break;
		default:
			break;
	}
}

function deeplSpeakOriginal(translate_now_source_language, both){
	let supported = translate_now_source_language == "auto" || translate_now_source_language == "en";
	if(!supported){
		if(both == false) sendMessage("notify", "Original - DeepL Translator Voice does not support other languages than English");
		return false;
	}

	let element = document.querySelector("button[data-testid='translator-speaker-source']");
	if(element != null){
		element.click();
	}else{
		if(both == false) sendMessage("notify", "Original - DeepL Translator Voice could not find the audio button");
	}
	
	return true;
}

function deeplSpeakTranslation(translate_now_destination_language, both){
	let supported = translate_now_destination_language == "auto" || translate_now_destination_language == "en";
	if(!supported){
		if(both == false) sendMessage("notify", "Translation - DeepL Translator Voice does not support other languages than English");
		return false;
	}

	let element = document.querySelector("button[data-testid='translator-speaker-target']");
	if(element != null){
		element.click();
	}else{
		if(both == false) sendMessage("notify", "Translation - DeepL Translator Voice could not find the audio button");
	}
	
	return true;
}

function bingSpeakSource(){
	// POST https://www.bing.com/tfettts?isVertical=1&=&IG=63E6C7332DDC4184914D3E96D2D62B79&IID=translator.5024.1
	// &ssml=
	// <speak version='1.0' xml:lang='fr-FR'>
	// <voice xml:lang='fr-FR' xml:gender='Female' name='fr-FR-DeniseNeural'>
	// 		<prosody rate='-20.00%'>bla</prosody></voice>
	// </speak>
	//&token=1HDvGf7WVzLhnhs_5E8ZVl1nsEMEIUBI
	//&key=1703174914140
	
	setTimeout(function(){
		let speakButton = document.querySelector("#tta_playiconsrc");
		speakButton.click();
	}, 3000);
}

function bingSpeakDestination(){
	setTimeout(function(){
		let speakButton = document.querySelector("#tta_playicontgt");
		speakButton.click();
	}, 3000);
}

function googleSpeak(translate_now_source_language, translate_now_destination_language, translate_now_to_speak){
	switch(translate_now_to_speak){
		case "original":
			googleSpeakInternal(true, false);
			break;
		case "translation":
			googleSpeakInternal(false, true);
			break;
		case "both":
			let playDestination = getSourceText() != getDestinationText();
			googleSpeakInternal(true, playDestination); // play both if the texts aren't equal
			break;
		default:
			break;
	}
}

function googleSpeakInternal(playOriginal, playDestination){	
	let sourceText = getSourceText();
	let sourceDuration = 2500 + 85 * sourceText.length;
	
	let that = this;

	if(playOriginal){
		//this.document.querySelector(".m0Qfkd button span.material-icons-extended").click();
		document.querySelector(".m0Qfkd button span.material-icons-extended").children[0].click();

		/*let sourceSpeakLanguage = getSourceSpeakLanguage();
		if(sourceSpeakLanguage == "") sourceSpeakLanguage = "en";
	
		let audioObj = playSound(sourceSpeakLanguage, sourceText);
		sourceDuration = audioObj.duration * 1000;
		*/
	}
	
	if(playDestination){
		
		setTimeout(function(){
			//document.querySelector(".VO9ucd button span.material-icons-extended").click();
			that.document.querySelector(".VO9ucd button span.material-icons-extended").children[0].click();

			/*let destinationText = that.getDestinationText();
			let destinationSpeakLanguage = that.getDestinationSpeakLanguage();

			that.playSound(destinationSpeakLanguage, destinationText);*/
		}, sourceDuration + 150);
	}
	
	//googleSpeakPlayAfter(audioObj, playDestination);
}

/*function googleSpeakPlayAfter(audioObj, playDestination){
	if(!playDestination) return;
	
	let duration = 0;
	
	audioObj.addEventListener('loadedmetadata', function() {
		duration = audioObj.duration * 1000;
		googleSpeakDestination(audioObj.duration * 1000);
	});
	
	setTimeout(function(){
		if(duration == 0){
			googleSpeakDestination(0);
		}
	}, 2000);
}
*/

// document.querySelector(".VfPpkd-Bz112c-kBDsod").click() -> play source button
// document.querySelector(".VfPpkd-Bz112c-kBDsod").click() -> play source button


/* Google Translate (Speak) */
function playSound(speakLanguage, text){
	let speakUrl = googletranslate.getSpeakUrlSource(speakLanguage, text);
	let audioObj = new Audio(speakUrl);

	audioObj.play();
	return audioObj;
}
function getSourceSpeakLanguage(){
	let sourceLanguage = document.querySelector('#c66').getAttribute('data-language-code');
	
	return sourceLanguage;
}
function getSourceText(){
	let source = document.querySelector("textarea.er8xn");
	return source != null ? source.value : "";
}
function getDestinationSpeakLanguage(){
	let destinationLanguage = document.querySelector('#c7').getAttribute('data-language-code');
	return destinationLanguage;
}
function getDestinationText(){
	let resultBox = document.querySelector("#c71");
	return resultBox != null ? resultBox.innerText : "";
}
