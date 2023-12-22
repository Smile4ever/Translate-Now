/* Methods in the googletranslate object can be used anywhere */
let googletranslate = {
	getSpeakUrlSource: function(language, newText){
		let speakUrl = "https://translate.google.com/translate_tts?tl=" + language + "&client=tw-ob&q=" + newText;
		
		return speakUrl;
	}
}
