var asm = {

	movlw: function (val){
		console.log("movlw", parseInt(val));		//TODO:test
	},
	movwf: function (val){
		console.log("movf", val.name);
	},
	movwff: function (val){
		console.log("movff", val.name);
	}
}