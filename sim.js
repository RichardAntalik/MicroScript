var sim = {
	led: function(parentElement, register, bit){
		this.l = new logger('LED '+ register.name + " " + bit);
		logger.e('Constructor');
		this.parentElement = parentElement;
		this.register = register;
		this.bit = bit;

		this.state = false;

		this.LEDelement = $('<div style="width: 18px; height: 18px; border-radius: 50%; background: red; display: inline-block" />');
		this.textElement = $('<span />');
		this.frameElement = $('<div />');

		this.frameElement.append(this.LEDelement);
		this.frameElement.append(this.textElement);
		this.frameElement.append('<br />');

		parentElement.append(this.frameElement);

		this.on = function(){
			logger.e('on');
			this.state = true;
			this.textElement.html("LED: ON");
			this.LEDelement.css( "background", "green" );
			logger.x('on');
		};
		this.off = function(){
			logger.e('off');
			this.state = true;
			this.textElement.html("LED: OFF");
			this.LEDelement.css( "background", "red" );
			logger.x('off');
		};
		this.remove=function(){
			logger.e('remove');
			this.frameElement.remove();
			logger.x('remove');
		};

		var that = this;
		register.onStateChange(function(){
//			that.l.l("processing event", that.register);
			that.l.l("processing event");
			if (that.register.value & Math.pow(2, that.bit)){
				that.on();
			} else {
				that.off();
			}
		});
		logger.x('Constructor');
		return this;
	},
	
	stepLine: 1,
	step: function(){
		logger.e('step');

		editor.focus();
		editor.setHighlightActiveLine(true);

		editor.gotoLine(this.stepLine);
		editor.session.selection.selectLine();
		this.stepLine++;

		var line = editor.getCopyText();

		var crushed = ms.parse(line);
		logger.x('step');
	},

	simulateSelection: function(){
		logger.e('simulateSelection');
		var selection = editor.getCopyText();
		var crushed = ms.parse(selection);
		logger.x('simulateSelection');
	},
}
function Listener () {
	this.listeners = [];
	logger.e('Constructor');
	this.add = function(fn){
		logger.e("add");
		this.listeners.push(fn);
		logger.x('add');	
	}

	this.call = function () {
		logger.e('call')
		for (var listener of this.listeners){
			logger.l("calling", listener);
			listener();
		}
		logger.x('call');
	}
	logger.x('constructor');
}