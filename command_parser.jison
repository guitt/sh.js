/* lexical grammar */
%lex
%%

\s+                   {return 'SPACE'}
\S+                   {return 'WORD';}
<<EOF>>               {return 'EOF';}
.                     {return 'INVALID';}

/lex

/* operator associations and precedence */

%left 'SPACE'

%start expressions

%% /* language grammar */

expressions
    : e EOF
        {return $1;}
    ;

e
    : e 'SPACE' WORD
        {$1.push($3); $$ = $1}
    | WORD
        {$$ = [$1];}
    ;
