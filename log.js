
var Logger = function () {
    this.e = function () {
        var args = Array.prototype.slice.call(arguments);
        var msg = args[0];
        args.shift();
        console.group('>>>>>>>>');
        this.log(arguments.callee.caller, msg, args);
    };
    this.x = function () {
        var args = Array.prototype.slice.call(arguments);
        var msg = args[0];
        args.shift();
        this.log(arguments.callee.caller, msg, args);
        this.log(null,'<-------',null);
        console.groupEnd();
    };
    this.log = function (caller, msg, args) {
        var message = [];

        caller ? message.push(caller) : null;
        msg ? message.push(msg) :null;

        if (args){
            for (var arg of args){
                message.push(arg);
            }
        }
        console.log.apply(console, message);
    };
    this.l = function () {
        var args = Array.prototype.slice.call(arguments);
        var msg = args[0];
        args.shift();
        this.log(arguments.callee.caller, msg, args);
    };
};
var logger = new Logger();