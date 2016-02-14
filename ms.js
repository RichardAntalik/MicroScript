/*globals console, editor, $*/
/*jslint browser:true, white: true, vars: true */
var ms = {
//////////////////////////////////////////////////////////////////////////////////////////////////////////   STAGE 1
	preprocessor: {
		code: [],
		pointer: 0,
		crush: function(code){
			logger.e('crush');
		    logger.l('code:', code);
		    var crushRE = /(\\|\.|\+\+|\+=|\+|--|-=|-|\*=|\*|\/=|\/|%=|%|===|==|=|!=|!==|<<|<|>>>|>>|>|<=|>=|\?|:|,|'|"|;|\(|\)|\[|]|\{|}|&|\||\^|~|var|function|new|class|const|delete|else|export|extends|import|in|instanceof|return|throw|typeof|void|yield|of)/gm;

		    var crushed = code.split(crushRE);
		    logger.l("crushed:",crushed);

			crushed = this.repairStrings(crushed);
			crushed = this.cleanCrushed(crushed);
			crushed = this.cleanWS(crushed);
			logger.l('crushed final', crushed);
		    logger.x('crush');
		    return crushed;
		},
		cleanCrushed:function(crushed){
			logger.e('cleanCrushed');
			var cleaned;
		    var wsRE = /^\s*$/;

			for(var i = 0; i < crushed.length;i++) {
			    if(wsRE.test(crushed[i]) || crushed[i] === '') {
			       	crushed.splice(i, 1);
					//logger.l('deleting', crushed[i], 'at', i);
			    }
			}
			cleaned = crushed;

			logger.l('cleaned:', cleaned);	
			logger.x('cleanCrushed');
			return cleaned;
		},
		cleanWS:function(crushed){		//not in strings
			logger.e('cleanWS');
			var cleaned;

		    var wsRE = /\s/gm;

			for(var i = 0; i < crushed.length;i++) {
			    if(!(crushed[i][0] === "\"" || crushed[i][0] === "\'" )) {		//NEGATION
			       crushed[i] = crushed[i].replace(wsRE, "");
				//		       logger.l('repl', crushed[i]);
			    }
			}
			cleaned = crushed;
			logger.l('cleaned WS', cleaned);
			logger.x('cleanWS');
			return cleaned;
		},
		repairStrings: function(crushed){
			logger.e('repairStrings');
			var repaired = [];
			var str;
			var terminator;

			for (var i = 0; i < crushed.length;i++){			//repair escaped ", '
				if(crushed[i] === "\\" && (crushed[i+1] === "\"" || crushed[i+1] === "\'" )){
					repaired.push(crushed[i]+crushed[i+1]);
					i++;
				} else {
					//logger.l("pushing", crushed[i], 'at', i);
					repaired.push(crushed[i]);
				}
			}
			logger.l('repaired stage1' , repaired);

			for (i = 0; i < repaired.length;i++){						//concat  strings
				if(repaired[i] === "\"" || repaired[i] === "\'"){
					logger.l('start repairing at', i);
					terminator = repaired[i];
					str = "";
					do {
						str += repaired[i];
						logger.l("concat:", repaired[i]);
						repaired.splice(i, 1);
					} while(repaired[i] !== terminator);
					repaired[i] = str + terminator;
					i++;
				}
			}
			logger.l('repaired', repaired);
			logger.x('repairStrings');
			return repaired;
		},
		splitVars: function(code){
			logger.e('splitVars');
			var j = 0;
			for(var i = 0; i < code.length; i++){
				if (code[i] === 'var' && code[i-2] !== 'for') {
					logger.l('start splitting');
					while(code[i+j] !== ';' && code[i+j]) {
						if((code[i+j-1] === ',' || code[i+j-1] === 'var')){
							if(code[i+j-1] === 'var'){
								//logger.l('code to splice will be', code[i+j-1], code[i+j], code[i+j+1]);	
								code.splice(i+j-1, 1);			//Y was totaly drunk while writing this^ so...
								j--;
							}
							if(code[i+j-1] === ','){
								code[i+j-1] = ';'
							}
							code.splice(i,0, 'var');
							i++;
							code.splice(i,0, code[i+j]);
							i++;
							code.splice(i,0, ';');
							i++;
						}
						j++;
					}
					logger.l('got ; - reset');
					j = 0;
				}
			}
			logger.x('splitVars');
			return code;
		},

		packObjects: function (){
			logger.e("packObjects");
			var opening = /\{|\[|\(/;
			var closing = /}|]|\)/;

			var packed = [];
			var level = 1;
			var instr;

			packed.push(this.code[this.pointer]); //pack opening
			this.pointer++;
			do{
				instr = this.code[this.pointer];
				if (typeof instr !== 'object' && opening.test(instr)) {
					level++;
					packed.push(this.packObjects());
					this.pointer--;
				} else {
					packed.push(instr);
				}
				this.pointer++;
			} while ((!closing.test(instr) || typeof instr === 'object') && instr);

			logger.x("packObjects");
			return packed;
		},
		packIdentifiers:function(code){
			var pointer = 0;
			var pack;
			while(code[pointer]){
				if (code[pointer] === '.'){
					var rem = [0,2];		//default range to splice
					if (code[pointer-1] instanceof ms.identifier){
						pack = code[pointer-1];
					} else {
						pack = new ms.identifier();
						if (code[pointer-1] instanceof Array){		//is this index of identifier?
							pack.rawCode.push(code[pointer-2]);
							rem[0] = 1;
						}
						pack.rawCode.push(code[pointer-1]);
					}
					pack.rawCode.push(code[pointer]);				//default action
					pack.rawCode.push(code[pointer+1]);
					if (code[pointer+2] instanceof Array){		//is this index of identifier?
						if (!(code[pointer+2][0] === '(' && code[pointer+3] !== '.')) {		//NEGATION
							pack.path.push(code[pointer + 2]);								//don't incl () if last item
							rem[1] = 3;
						}
					}
					code[pointer-rem[0]-1] = pack;				//save pack to ident start
					logger.l('test',code[pointer+rem[1]]);
					code.splice(pointer-rem[0], rem[0]+rem[1]);
					pointer = pointer - rem[0] - 1;
				} else if (code[pointer] instanceof Array){
					this.packIdentifiers(code[pointer]);
				}
				pointer++;
			}
		},
		preprocess: function () {
			logger.e('preprocess');
			console.time("preprocess");
			editor.session.selection.selectAll();
			var code = editor.getCopyText();
			this.code = this.crush(code);
			logger.l("crush finished.", this.code);
			this.code = this.splitVars(this.code);
			logger.l('vars splited.', this.code);
			this.code = this.packObjects();
			logger.l("Objects Packed.", this.code);
//			this.packIdentifiers(this.code);
//			logger.l("Identifiers Packed.", this.code);
			this.pointer = 0;
			logger.x('preprocess');
			return this.code;
		}
	},
//////////////////////////////////////////////////////////////////////////////////////////////////////////   STAGE 2
	parser: {
		parse: function (){
			logger.e('parse');
			console.time("parse");
			this.msGlobal = new ms.fun('msGlobal', [], ms.preprocessor.preprocess());
			this.parseFunction(this.msGlobal);		//PASS 1 - translate object literals
			logger.l('parsed:', this.msGlobal);
			this.parseOperators(this.msGlobal.statements);
			logger.l('parsed:', this.msGlobal);
			this.msGlobal.pointer = 0;
			console.timeEnd("preprocess");
			console.timeEnd("parse");
			logger.x('parse');
			return this.msGlobal;
		},
		parseOperators:function(statements){
			for (var statement of statements) {
				if (statement instanceof ms.arr || statement instanceof ms.obj) {
					// recurse to EACH member statements
				} else if (statement instanceof ms.fun) {
					// recurse to statements
				} else if (statement instanceof ms.identifier) {
					//recurse to EACH identifier. EACH path
				} else if (statement instanceof Array && statement[0] === 'call') {
					//recurse to identifier
					//recurse to arguments statements
				} else if (statement instanceof Array) {	//loops + cond.
					//recurse to statements
					//recurse to loop body statements
				}
			}
			this.parseOperatorsInStatements(statements);
		},
		parseOperatorsInStatements:function(statements){
			var operators = ['++','--','!','~','**','*','/','%','+','-','<<','>>','>>>','<','>','<=','>=','==','!=',
				'===','!==','='];
			for(var operator of operators) {
				var pos = statements.indexOf(operator);
//				var group = new ms.group();
				if (pos >= 0){
					logger.l('got', statements[pos], '@', pos);
					logger.l(statements[pos-1], statements[pos], statements[pos+1]);
				}
/*				group.statements.push(statements[pos - 1]);
				group.statements.push(statements[pos]);
				group.statements.push(statements[pos + 1]);
				logger.l(group);*/
			}
		},
		isOperator: function(code){
			logger.e('isOperator');
			var operators = /(\+\+|\+=|\+|--|-=|-|\*=|\*|\/=|\/|%=|%|=|<<|<|>>>|>>|>|<=|>=|&|\||\^|~|=|==|===)/gm;
			var ret = operators.test(code);
			logger.x('isOperator',ret);
			return ret;
		},
		parseExpression:function (NS, memberName) {
			logger.e('parseExpression');
			var numRE = /^\s*(-?[0-9]*([.]?[0-9]+))(((e|E)(-|\+)?)[0-9]+)?\s*$/;
			var parsed;
			var msfun;
			var group;
			logger.l('parsing:', NS.getRaw());
					//											===========[  FUNCTION  ]===========
			if(NS.getRaw() ==='function'){
				if(NS.getRaw(1) instanceof Array){
					msfun = new ms.fun("", NS.getRaw(1), NS.getRaw(2));		//anonymous
					NS.nextRaw(2);
				} else {
					msfun = new ms.fun(NS.getRaw(1), NS.getRaw(2), NS.getRaw(3));		//named declaration
					if(NS.getRaw(-1) !== '=' && NS.primitiveType === 'Function'){
						NS.msvars[NS.getRaw(1)] = msfun;
					}
					NS.nextRaw(3);
				}
				this.parseFunction(msfun);
				msfun.statements.shift();		//remove {...}
				msfun.statements.pop();
				parsed = msfun;
						//											===========[  OBJECT  ]===========
			} else if (NS.getRaw() instanceof Array && NS.getRaw()[0] === '{'){
				var msObj = new ms.obj(NS.getRaw());
				msObj.rawCode.shift();		//remove {...}
				msObj.rawCode.pop();
				this.parseObject(msObj);
				parsed = msObj;
						//											===========[  ARRAY  ]===========
			} else if(NS.getRaw() instanceof Array && NS.getRaw()[0] === '[' && !(NS.statements[NS.statements.length-1] instanceof ms.identifier)){
				var msArr = new ms.arr();
				msArr.rawCode = NS.getRaw();
				msArr.rawCode.shift();		//remove [...]
				msArr.rawCode.pop();
				this.parseArray(msArr);
				parsed = msArr;
						//											===========[  BOOL  ]===========
			} else if(NS.getRaw() === 'true'  || (NS.getRaw() === 'false')){
				parsed = new ms.bool(NS.getRaw() === 'true');
						//											===========[  NULL  ]===========
			} else if((NS.getRaw() === 'null')){
				parsed = new ms.null();
						//											===========[  NUMBER  ]===========
			} else if(numRE.test(NS.getRaw()[0])){
				parsed = new ms.num(Number(NS.getRaw()));
						//											===========[  STRING  ]===========
			} else if(NS.getRaw()[0] === "\"" || NS.getRaw()[0] === "\'"){
				parsed = new ms.str(NS.getRaw().slice(1, -1));
						//											===========[  IF FOR WHILE  ]===========
			}else if(NS.getRaw() === 'for' || NS.getRaw() === 'if' || NS.getRaw() === 'while'){
				parsed = [];
				parsed.push(NS.getRaw());	//push in KW
				group = new ms.group(NS.getRaw(+1));	//parse ()
				this.parseGroup(group);
				parsed.push(group);
				group = new ms.group(NS.getRaw(+2));		//parse {}
				this.parseGroup(group);
				parsed.push(group);
				NS.nextRaw(2);
						//											===========[  ELSE  ]===========
			} else if (NS.getRaw() === 'else'){
				var prevCond = NS.statements[NS.statements.length-1];
				logger.l(NS.statements);
				prevCond.push(NS.getRaw());
				if (NS.getRaw(+1) === 'if'){
					prevCond.push(NS.getRaw(+1));	//push in if
					group = new ms.group(NS.getRaw(+2));	//parse ()
					this.parseGroup(group);
					prevCond.push(group);
					group = new ms.group(NS.getRaw(+3));		//parse {}
					this.parseGroup(group);
					prevCond.push(group);
					NS.nextRaw(3);
				} else {
					group = new ms.group(NS.getRaw(+1));	//parse ()
					this.parseGroup(group);
					prevCond.push(group);
					NS.nextRaw(1);
				}
						//											===========[  DO  ]===========
			} else if (NS.getRaw() === 'do'){
				parsed = [];
				parsed.push(NS.getRaw());	//do kw
				group = new ms.group(NS.getRaw(+1));	//parse {}
				this.parseGroup(group);
				parsed.push(group);
				parsed.push(NS.getRaw(2));					//while kw
				group = new ms.group(NS.getRaw(+3));		//parse ()
				this.parseGroup(group);
				parsed.push(group);
				NS.nextRaw(3);
						//											===========[  VAR  ]===========
			} else if (NS.getRaw() === '('){
			} else if (NS.getRaw() === ')'){
			} else if (NS.getRaw() === '.'){
			} else if (NS.getRaw() === 'var'){
				//do nothing
						//											===========[  CALL  ]===========
			} else if (NS.getRaw() instanceof Array && NS.getRaw()[0] === "(" && !this.isOperator(NS.getRaw(-1))){
				this.parseCall(NS);
						//											===========[  GROUP  ]===========
			} else if (NS.getRaw() instanceof Array && NS.getRaw()[0] === "("){
				parsed = new ms.group(NS.getRaw());
				this.parseGroup(parsed);
						//											===========[  EOS  ]===========
			} else if (this.isOperator(NS.getRaw())){
				parsed = NS.getRaw();
			} else if (NS.getRaw() === ';'){
				parsed = NS.getRaw();
						//											===========[  IDENTIFIER  INDEX]===========
			} else if(NS.getRaw() instanceof Array && NS.getRaw()[0] === '[' && (NS.statements[NS.statements.length-1] instanceof ms.identifier)){
				this.parseIdentifierIndex(NS);
						//											===========[  IDENTIFIER  ]===========
			} else {
				parsed =  this.parseIdentifier(NS);
			}
			logger.l('parsed:', parsed);
			if(parsed){		//not empty
				if(NS.primitiveType === 'Group' || NS.primitiveType === 'Identifier' ){
					NS.addStatement(parsed);
				} else if(NS.primitiveType === 'Function'){
					NS.addStatement(parsed);
				} else if(NS.primitiveType === 'Object'){
					logger.l('adding member');
					NS.members[memberName] = parsed;
				} else if(NS.primitiveType === 'Array'){
					NS.members.push(parsed);
				}
			}
			logger.x('parseExpression');
		},
		parseIdentifier:function(NS){
			var id;
			if(NS.getRaw(-1) === '.' && NS.statements[NS.statements.length - 1] instanceof ms.identifier) {//existID
				id = NS.statements[NS.statements.length - 1];
				id.path.push([NS.getRaw()]);
			} else if(NS.getRaw(-1) === '.'){											//access to ret val member
				id = new ms.identifier();
				id.path.push(NS.statements[NS.statements.length - 1]);
				id.path.push([NS.getRaw()]);
				NS.statements[NS.statements.length - 1] = id;
			} else {																			//new id
				id = new ms.identifier();
				id.path.push([NS.getRaw()]);
				return id;
			}
		},
		parseIdentifierIndex:function(NS){
			var id = NS.statements[NS.statements.length-1];
			var path = id.path[id.path.length-1];
			path.push(NS.getRaw()[1]);		//TODO:parse indexes as group`
		},
		parseCall:function(NS){
			var call = [];
			var group;
			call.push('call');
			call.push(NS.statements[NS.statements.length-1]);
			group = new ms.group(NS.getRaw());
			logger.l('passing arguments', NS.getRaw());
			this.parseGroup(group);
			call.push(group);
			NS.statements[NS.statements.length-1] = call;
		},
		parseGroup:function(NS){
			logger.e();
			while(NS.getRaw()){
				this.parseExpression(NS);
				NS.nextRaw();
			}
			logger.x();
		},
		parseObject: function(NS){
			logger.e('parseObject');

			while(NS.getRaw()){
				logger.l('processing:', NS.getRaw());
				var memberName = NS.getRaw();
				NS.nextRaw();
				NS.nextRaw();
				var group = new ms.group();
				while (NS.getRaw() && NS.getRaw() !== ','){
					logger.l('adding to group:', NS.getRaw());
					group.rawCode.push(NS.getRaw());
					NS.nextRaw();
				}
				this.parseGroup(group);
				NS.members[memberName] = group;
				NS.nextRaw();
			}

			logger.x('parseObject');
		},
		parseArray: function(NS){
			logger.e('parseArray');
			while(NS.getRaw()){
				var group = new ms.group();
				while (NS.getRaw() && NS.getRaw() !== ','){
					logger.l('adding to group:', NS.getRaw());
					group.rawCode.push(NS.getRaw());
					NS.nextRaw();
				}

				this.parseGroup(group);
				NS.members.push(group);
				NS.nextRaw();
			}

			logger.x('parseArray');
		},
		parseFunction: function(NS){
			logger.e('parseFunction');

			while(NS.getRaw()){
				this.parseExpression(NS);
				NS.nextRaw();
			}
			logger.x('parseFunction');
		}
	},
//////////////////////////////////////////////////////////////////////////////////////////////////////////   BULLSHIT
	gridMan: {
		cells: [],
		outputEl: {},
		cell:function() {
			this.createCellElement = function(){
				var size = "20px";
				var cssProps = {
					"width": size,
					"height": size,
					"display": "block",
					"float": "left",
					"margin": "1px",
					"padding": "0px",
					"border": "1px solid black"
				};
				return $('<div />').css(cssProps);
			};
			this.render = function(outputEl){
				outputEl.append(this.el, null);
			};

			this.el = this.createCellElement();
		},
		createCells: function(rows, cols){
			logger.e('createCells');
			for (var i=0; i<=rows;i++){
				for (var j=0; j<=cols;j++){
					var cell = new this.cell();
					this.cells.push(cell);
					cell.render(this.outputEl);
				}
			}
			//logger.l("cells",this.cells);
			logger.x('createCells');
		}
	},
//////////////////////////////////////////////////////////////////////////////////////////////////////////   STAGE 3
	simulator: {
		msGlobal: undefined,
		stack: [],
		step:function (NS) {
			logger.e('step');
			if(!this.msGlobal){
				this.msGlobal = ms.parser.parse();
				this.msGlobal.pointer = 0;
				this.stack.push(this.msGlobal);
			}
			NS = this.stack[this.stack.length-1];
			while(!NS.getStatement()){
				this.stack.pop();
			}

			this.execute(NS);
			NS.nextStatement();
			logger.x('step');
		},
		execute: function (NS) {
			logger.e('execute');
			logger.l('executing', NS.getStatement());
			switch (NS.getStatement()){
				case 'var':
					//define new var
				break;
					//do some other keywords
			}
			if (NS.getStatement() === '=') {
				var leftName = NS.getStatement(-1);
				var leftpath = this.getLeftPath(NS);
				var leftOperand = this.getReference(NS, leftpath);
				var rightOperand = this.getRightReference(NS);
				if(typeof leftName === 'object')leftName = leftName.members[0].value;
				logger.l('LO',leftOperand[leftName]);
				logger.l('RO',rightOperand);

				leftOperand[leftName] = rightOperand;
			} else if (NS.getStatement(1) instanceof Array && !(NS.getStatement(2) instanceof Array)){
				if(NS.getStatement(2) !== 'array'){
					logger.l('we\'ve got a function - pushing on stack');
					this.stack.push(NS.getStatement());
				}
			}
			logger.x('execute');
		},
		getRightReference: function (NS) {
			logger.e('getRightReference');

			if(typeof NS.getStatement(1) === 'object'){
				logger.x('getRightReference Got literal', NS.getStatement(1));
				return NS.getStatement(1);
			} else {
				var path = this.getRightPath(NS);
				var lastName = path[path.length-1];
				if (typeof lastName === 'object') {lastName = lastName.members[0].value;}
				logger.l('lastName',lastName);
				return this.getReference(NS, path)[lastName];
			}
		},
		getRightPath: function(NS) {
			var i=0;
			var path = [];
			while(NS.getStatement(i) !== ';' &&  NS.getStatement(i)){
				i++;
				path.push(NS.getStatement(i));
				logger.l('stepping forward', NS.getStatement(i), i);
			}
			path.pop();
			logger.l('start should be', path[0]);
			return path;
		},
		getLeftPath: function (NS){
			var i=0;
			var path = [];
			while(NS.getStatement(i) !== ';' &&  NS.getStatement(i)){
				i--;
				path.push(NS.getStatement(i));
				logger.l('stepping backwards', NS.getStatement(i), i);
			}
			path.pop();
			path.reverse();
			logger.l('start should be', path[0]);
			return path;
		},
		getReference: function (NS, path) {			//olol
			logger.e('getReference');
			var lastReference, lastName;
			var index;
			if(path[0] === 'this'){
				logger.l('got this');
				lastReference = NS;
				lastName = "";
				path.shift();
			} else {
				if(NS.getVarByName(path[0])){
					logger.l('var found in NS');
					lastReference = NS.msvars;
					lastName = path[0];
					path.shift();
				} else if (this.msGlobal.getVarByName(path[0])){
					logger.l('var found in msGlobal');
					lastReference = this.msGlobal.msvars;
					lastName = path[0];
					path.shift();
				} else {
					logger.l('var not found - creating var');
					this.msGlobal.msvars[path[0]] = new ms.undef();
					lastReference = this.msGlobal.msvars;
					lastName = path[0];
					path.shift();
					if(path.length){
						logger.l('REFERENCE ERROR access to property of undefined');
						return false;
					}
				}
			}
			while(path.length){
			if(path.length && lastName){					//woweeeee
				lastReference = lastReference[lastName];
				lastName = "";
			}
				
				logger.l('looking up', path[0]);
				logger.l('LR:', lastReference);
				logger.l('LN:', lastName);
				if(typeof path[0] === 'object'){
					index = path[0].members[0].value;
					logger.l('INDEX', index);
					if(lastReference.members[index]){
						logger.l('index found');
						lastReference = lastReference.members;
						lastName = index;
					} else {
						logger.l('create index', lastName, index);		//TODO: check type?
						lastReference.members[index] = new ms.undef();
						lastReference = lastReference.members;
						lastName = index;
						path.shift();
						logger.l('len:', path.length);
						if(path.length){
							logger.l('REFERENCE ERROR access to property of undefined');
							return false;
						}
					}
				} else if(path[0] !== '.'){
					if(lastReference.members[path[0]]){
						logger.l('member found');
						lastReference = lastReference.members;
						lastName = path[0];
					} else {
						logger.l('create member');		//TODO: check type?
						lastReference.members[path[0]] = new ms.undef();
						lastReference = lastReference.members;
						lastName = path[0];
						path.shift();
						if(path.length){
							logger.l('REFERENCE ERROR access to property of undefined');
							return false;
						}
					}
				}
				path.shift();
			}
			logger.l('LR:', lastReference);
			logger.l('LN:', lastName);
			logger.l('msGlobal', this.msGlobal);
			return lastReference;			//because fuck you, that's why
		},


		isKeyword: function(code){
			logger.e('isKeyword');
			logger.l('code', code);
			var keywords = /(var|function|new|class|const|delete|else|export|extends|import|in|instanceof|return|throw|typeof|void|yield)/gm;
			var ret = keywords.test(code) && !(code instanceof Array);
			logger.x('isKeyword', ret);
			return ret;
		},
		isExpression: function(code){
			logger.l('isExpression', !this.isKeyword(code));
			return !this.isKeyword(code);
		}
	}
};
//////////////////////////////////////////////////////////////////////////////////////////////////////////   PRIMITIVES
ms.obj = function(rawCode){
	this.primitiveType = "Object";
	this.rawCode = rawCode;
	this.pointer = 0;
	this.name = name;
	this.members = [];

	this.getRaw = function(offset){
		if(!offset) offset = 0;
		return this.rawCode[this.pointer + offset];
	};
	this.nextRaw = function(amt){ //def 1
		if(!amt) amt = 1;
		this.pointer += amt;
	}
};
ms.fun = function(name, args, rawCode){
	logger.l("creating msfun");
	this.rawCode = rawCode;
	this.pointer = 0;
	this.statements = [];
	this.statementPointer = 0;
	this.members = [];
	this.primitiveType = "Function";
	this.msvars = [];
	this.name = name;
	this.addStatement = function(statement){
		this.statements.push(statement);
	};

	this.getVarByName = function(name){
		return this.msvars[name];
	};
	this.getRaw = function(offset){
		if(!offset) offset = 0;
		return this.rawCode[this.pointer + offset];
	};
	this.nextRaw = function(amt){ //def 1
		if(!amt) amt = 1;
		this.pointer += amt;
	};
	this.getStatement = function(offset){
		if(!offset) offset = 0;
		return this.statements[this.statementPointer + offset];
	};
	this.nextStatement = function(amt){ //def 1
		if(!amt) amt = 1;
		this.statementPointer += amt;
	};
	logger.l('done');				//are those really object?
};
ms.group = function(rawCode){
	logger.e();
	logger.l('RAW:', rawCode);
	if (!rawCode){
		rawCode = [];
	}
	this.rawCode = rawCode;
	this.pointer = 0;
	this.statements = [];
	this.statementPointer = 0;
	this.primitiveType = "Group";
	this.addStatement = function(statement){
		this.statements.push(statement);
	};
	this.getRaw = function(offset){
		if(!offset) offset = 0;
		return this.rawCode[this.pointer + offset];
	};
	this.nextRaw = function(amt){ //def 1
		if(!amt) amt = 1;
		this.pointer += amt;
	};
	this.getStatement = function(offset){
		if(!offset) offset = 0;
		return this.statements[this.statementPointer + offset];
	};
	this.nextStatement = function(amt){ //def 1
		if(!amt) amt = 1;
		this.statementPointer += amt;
	};
	logger.x();
};
ms.identifier = function(){
	this.path = [];
};
ms.arr = function(){
	this.members = [];
	this.primitiveType = "Array";
	this.rawCode = [];
	this.pointer = 0;

	this.getRaw = function(offset){
		if(!offset) offset = 0;
		return this.rawCode[this.pointer + offset];
	};
	this.nextRaw = function(amt){ //def 1
		if(!amt) amt = 1;
		this.pointer += amt;
	}
};
ms.undef = function(name){
	this.name = name;
	this.primitiveType = "Undefined";
};
ms.str = function(value){
	this.value = value;
	this.primitiveType = "String";
};
ms.num = function(value){
	this.value = value;
	this.primitiveType = "Number";
};
ms.null = function(){
	this.value = null;
	this.primitiveType = "Null";
};
ms.bool = function(value){
	this.value = value;
	this.primitiveType = "Boolean";
};
