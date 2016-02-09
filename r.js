
r = {};
r.TrisA = {
	name:"TRISA",
	address: 0xF92,
	value: 0,				//values on POR
	set: function(val){
		logger.e('set');
		this.value = val;
		asm.movlw(val);
		asm.movwf(this);
		logger.x('set');
	},
	get: function(){
		logger.l('get');
		return this.values;	//state of tris is always known
	}
};

r.PortA = {
	name: "PORTA",
	address: 0xf80,
	value: 0,				//values on POR
	isInit: 0,				//call init first

	onStateChangeListeners: new Listener(),

	set: function(val){		//OPT: check state change
		logger.e('set');
//			this.checkCFG();
		this.value = val;

		asm.movlw(val);
		asm.movwf(this);

		this.onStateChangeListeners.call();
		logger.x('set');
	},
	get: function(dest){		//OPT: check TRIS, 
		logger.e('get');
		if(!dest){
			asm.movf(this)
		} else {
			asm.movff(this, dest)
		}
		logger.x('get');
	},
	onStateChange: function(fn){
		logger.e('onStateChange');
		this.onStateChangeListeners.add(fn);
		logger.x('onStateChange');
	}
};

r.pa = r.PortA;
