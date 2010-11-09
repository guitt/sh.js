/* Jison generated parser */
var command_parser = (function(){
var parser = {trace: function trace() { },
yy: {},
symbols_: {"error":2,"expressions":3,"e":4,"EOF":5,"SPACE":6,"WORD":7,"$accept":0,"$end":1},
terminals_: {"2":"error","5":"EOF","6":"SPACE","7":"WORD"},
productions_: [0,[3,2],[4,3],[4,1]],
performAction: function anonymous(yytext,yyleng,yylineno,yy) {

var $$ = arguments[5],$0=arguments[5].length;
switch(arguments[4]) {
case 1:return $$[$0-2+1-1];
break;
case 2:$$[$0-3+1-1].push($$[$0-3+3-1]); this.$ = $$[$0-3+1-1]
break;
case 3:this.$ = [$$[$0-1+1-1]];
break;
}
},
table: [{"3":1,"4":2,"7":[1,3]},{"1":[3]},{"5":[1,4],"6":[1,5]},{"5":[2,3],"6":[2,3]},{"1":[2,1]},{"7":[1,6]},{"5":[2,2],"6":[2,2]}],
defaultActions: {"4":[2,1]},
parseError: function parseError(str, hash) {
    throw new Error(str);
},
parse: function parse(input) {
    var self = this,
        stack = [0],
        vstack = [null], // semantic value stack
        table = this.table,
        yytext = '',
        yylineno = 0,
        yyleng = 0,
        shifts = 0,
        reductions = 0,
        recovering = 0,
        TERROR = 2,
        EOF = 1;

    this.lexer.setInput(input);
    this.lexer.yy = this.yy;
    this.yy.lexer = this.lexer;

    var parseError = this.yy.parseError = typeof this.yy.parseError == 'function' ? this.yy.parseError : this.parseError;

    function popStack (n) {
        stack.length = stack.length - 2*n;
        vstack.length = vstack.length - n;
    }

    function lex() {
        var token;
        token = self.lexer.lex() || 1; // $end = 1
        // if token isn't its numeric value, convert
        if (typeof token !== 'number') {
            token = self.symbols_[token] || token;
        }
        return token;
    };

    var symbol, preErrorSymbol, state, action, a, r, yyval={},p,len,newState, expected, recovered = false;
    while (true) {
        // retreive state number from top of stack
        state = stack[stack.length-1];

        // use default actions if available
        if (this.defaultActions[state]) {
            action = this.defaultActions[state];
        } else {
            if (symbol == null)
                symbol = lex();
            // read action for current state and first input
            action = table[state] && table[state][symbol];
        }

        // handle parse error
        if (typeof action === 'undefined' || !action.length || !action[0]) {

            if (!recovering) {
                // Report error
                expected = [];
                for (p in table[state]) if (this.terminals_[p] && p > 2) {
                    expected.push("'"+this.terminals_[p]+"'");
                }
                var errStr = '';
                if (this.lexer.showPosition) {
                    errStr = 'Parse error on line '+(yylineno+1)+":\n"+this.lexer.showPosition()+'\nExpecting '+expected.join(', ');
                } else {
                    errStr = 'Parse error on line '+(yylineno+1)+": Unexpected " +
                                  (symbol == 1 /*EOF*/ ? "end of input" :
                                              ("'"+(this.terminals_[symbol] || symbol)+"'"));
                }
                    parseError.call(this, errStr,
                        {text: this.lexer.match, token: this.terminals_[symbol] || symbol, line: this.lexer.yylineno, expected: expected});
            }

            // just recovered from another error
            if (recovering == 3) {
                if (symbol == EOF) {
                    throw new Error(errStr || 'Parsing halted.');
                }

                // discard current lookahead and grab another
                yyleng = this.lexer.yyleng;
                yytext = this.lexer.yytext;
                yylineno = this.lexer.yylineno;
                symbol = lex();
            }

            // try to recover from error
            while (1) {
                // check for error recovery rule in this state
                if ((TERROR.toString()) in table[state]) {
                    break;
                }
                if (state == 0) {
                    throw new Error(errStr || 'Parsing halted.');
                }
                popStack(1);
                state = stack[stack.length-1];
            }
            
            preErrorSymbol = symbol; // save the lookahead token
            symbol = TERROR;         // insert generic error symbol as new lookahead
            state = stack[stack.length-1];
            action = table[state] && table[state][TERROR];
            recovering = 3; // allow 3 real symbols to be shifted before reporting a new error
        }

        // this shouldn't happen, unless resolve defaults are off
        if (action[0] instanceof Array && action.length > 1) {
            throw new Error('Parse Error: multiple actions possible at state: '+state+', token: '+symbol);
        }

        a = action; 

        switch (a[0]) {

            case 1: // shift
                shifts++;

                stack.push(symbol);
                vstack.push(this.lexer.yytext); // semantic values or junk only, no terminals
                stack.push(a[1]); // push state
                symbol = null;
                if (!preErrorSymbol) { // normal execution/no error
                    yyleng = this.lexer.yyleng;
                    yytext = this.lexer.yytext;
                    yylineno = this.lexer.yylineno;
                    if (recovering > 0)
                        recovering--;
                } else { // error just occurred, resume old lookahead f/ before error
                    symbol = preErrorSymbol;
                    preErrorSymbol = null;
                }
                break;

            case 2: // reduce
                reductions++;

                len = this.productions_[a[1]][1];

                // perform semantic action
                yyval.$ = vstack[vstack.length-len]; // default to $$ = $1
                r = this.performAction.call(yyval, yytext, yyleng, yylineno, this.yy, a[1], vstack);

                if (typeof r !== 'undefined') {
                    return r;
                }

                // pop off stack
                if (len) {
                    stack = stack.slice(0,-1*len*2);
                    vstack = vstack.slice(0, -1*len);
                }

                stack.push(this.productions_[a[1]][0]);    // push nonterminal (reduce)
                vstack.push(yyval.$);
                // goto new state = table[STATE][NONTERMINAL]
                newState = table[stack[stack.length-2]][stack[stack.length-1]];
                stack.push(newState);
                break;

            case 3: // accept

                this.reductionCount = reductions;
                this.shiftCount = shifts;
                return true;
        }

    }

    return true;
}};/* Jison generated lexer */
var lexer = (function(){var lexer = ({EOF:"",
parseError:function parseError(str, hash) {
        if (this.yy.parseError) {
            this.yy.parseError(str, hash);
        } else {
            throw new Error(str);
        }
    },
setInput:function (input) {
        this._input = input;
        this._more = this._less = this.done = false;
        this.yylineno = this.yyleng = 0;
        this.yytext = this.matched = this.match = '';
        return this;
    },
input:function () {
        var ch = this._input[0];
        this.yytext+=ch;
        this.yyleng++;
        this.match+=ch;
        this.matched+=ch;
        var lines = ch.match(/\n/);
        if (lines) this.yylineno++;
        this._input = this._input.slice(1);
        return ch;
    },
unput:function (ch) {
        this._input = ch + this._input;
        return this;
    },
more:function () {
        this._more = true;
        return this;
    },
pastInput:function () {
        var past = this.matched.substr(0, this.matched.length - this.match.length);
        return (past.length > 20 ? '...':'') + past.substr(-20).replace(/\n/g, "");
    },
upcomingInput:function () {
        var next = this.match;
        if (next.length < 20) {
            next += this._input.substr(0, 20-next.length);
        }
        return (next.substr(0,20)+(next.length > 20 ? '...':'')).replace(/\n/g, "");
    },
showPosition:function () {
        var pre = this.pastInput();
        var c = new Array(pre.length + 1).join("-");
        return pre + this.upcomingInput() + "\n" + c+"^";
    },
next:function () {
        if (this.done) {
            return this.EOF;
        }
        if (!this._input) this.done = true;

        var token,
            match,
            lines;
        if (!this._more) {
            this.yytext = '';
            this.match = '';
        }
        for (var i=0;i < this.rules.length; i++) {
            match = this._input.match(this.rules[i]);
            if (match) {
                lines = match[0].match(/\n/g);
                if (lines) this.yylineno += lines.length;
                this.yytext += match[0];
                this.match += match[0];
                this.matches = match;
                this.yyleng = this.yytext.length;
                this._more = false;
                this._input = this._input.slice(match[0].length);
                this.matched += match[0];
                token = this.performAction.call(this, this.yy, this, i);
                if (token) return token;
                else return;
            }
        }
        if (this._input == this.EOF) {
            return this.EOF;
        } else {
            this.parseError('Lexical error on line '+(this.yylineno+1)+'. Unrecognized text.\n'+this.showPosition(), 
                    {text: "", token: null, line: this.yylineno});
        }
    },
lex:function () {
        var r = this.next();
        if (typeof r !== 'undefined') {
            return r;
        } else {
            return this.lex();
        }
    }});
lexer.performAction = function anonymous(yy,yy_) {

switch(arguments[2]) {
case 0:return 6
break;
case 1:return 7;
break;
case 2:return 5;
break;
case 3:return 'INVALID';
break;
}
};
lexer.rules = [/^\s+/,/^\S+/,/^$/,/^./];return lexer;})()
parser.lexer = lexer;
return parser;
})();
if (typeof require !== 'undefined') {
exports.parser = command_parser;
exports.parse = function () { return command_parser.parse.apply(command_parser, arguments); }
exports.main = function commonjsMain(args) {
    if (!args[1])
        throw new Error('Usage: '+args[0]+' FILE');
    if (typeof process !== 'undefined') {
        var source = require('fs').readFileSync(require('path').join(process.cwd(), args[1]), "utf8");
    } else {
        var cwd = require("file").path(require("file").cwd());
        var source = cwd.join(args[1]).read({charset: "utf-8"});
    }
    return exports.parser.parse(source);
}
if (typeof module !== 'undefined' && require.main === module) {
  exports.main(typeof process !== 'undefined' ? process.argv.slice(1) : require("system").args);
}
}