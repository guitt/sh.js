/* lexical grammar */

/* \s is interpreted to /^\s\b/ instead of /^\s/ , hence the \s{1} */

%lex
%%

'\\'                  {return 'BACKSLASH';}
'"'                   {return 'DQUOTE';}
"'"                   {return 'SQUOTE';}
\s{1}                 {return 'SPACE';}
[^"'\s\\]+            {return 'WORD';}
<<EOF>>               {return 'EOF';}
.                     {return 'INVALID';}

/lex

%start command

%% /* language grammar */

command
    : argument_list EOF
        {return $1;} ;

argument_list
    :   argument {
          if (typeof $1 === 'string')
            $$= [$1];
          else
            $$ = $1;
    } | argument spaces argument_list {
          $3.unshift($1);
          $$ = $3;
    } ;

spaces
    : SPACE { $$ = $1 }
    | SPACE spaces { $$ = $1 } ;

argument
    : string { $$ = $1 }
    | string argument { $$ = $1.concat($2) } ;

string
    : BACKSLASH DQUOTE { $$ = $2 }
    | BACKSLASH SQUOTE { $$ = $2 }
    | BACKSLASH BACKSLASH { $$ = $2 }
    | WORD { $$ = $1 }
    | DQUOTE quotation DQUOTE { $$ = $2 }
    | SQUOTE quotation SQUOTE { $$ = $2 } ;

quotation
    : WORD quotation { $$ = $1.concat($2) }
    | WORD { $$ = $1 }
    | SPACE quotation { $$ = $1.concat($2) }
    | SPACE { $$ = $1 }
    | BACKSLASH DQUOTE quotation { $$ = $2.concat($3) }
    | BACKSLASH DQUOTE { $$ = $2 }
    | BACKSLASH SQUOTE quotation { $$ = $2.concat($3) }
    | BACKSLASH SQUOTE { $$ = $2 }
    | BACKSLASH BACKSLASH quotation { $$ = $2.concat($3) }
    | BACKSLASH BACKSLASH { $$ = $2 } ;
