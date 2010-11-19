/* lexical grammar */

/* \s generates /^\s\b/ instead of /^\s/ , hence the \s{1} */

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
    : argument_list EOF {return $1;}
    | spaces argument_list EOF {return $2;} ;

argument_list
    : { $$ = [] }
    | argument {
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
    | BACKSLASH SPACE { $$ = $2 }
    | BACKSLASH WORD { $$ = '\\' + $2 }
    | WORD { $$ = $1 }
    | DQUOTE dquotation DQUOTE { $$ = $2 }
    | SQUOTE squotation SQUOTE { $$ = $2 } ;

dquotation
    : { $$ = '' }
    | WORD dquotation { $$ = $1.concat($2) }
    | SPACE dquotation { $$ = $1.concat($2) }
    | BACKSLASH DQUOTE dquotation { $$ = $2.concat($3) }
    | SQUOTE dquotation { $$ = $1.concat($1) }
    | BACKSLASH BACKSLASH dquotation { $$ = $2.concat($3) }
    | BACKSLASH WORD dquotation { $$ = $1.concat($2, $3) } ;

squotation
    : { $$ = '' }
    | WORD squotation { $$ = $1.concat($2) }
    | SPACE squotation { $$ = $1.concat($2) }
    | BACKSLASH SQUOTE squotation { $$ = $2.concat($3) }
    | DQUOTE squotation { $$ = $1.concat($2) }
    | BACKSLASH BACKSLASH squotation { $$ = $2.concat($3) }
    | BACKSLASH WORD squotation { $$ = $1.concat($2, $3) } ;
