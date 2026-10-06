import os
import re

targets = [
    'node_modules/@luxalgo/vela-pinets/dist/index.cjs',
    'node_modules/@luxalgo/vela-pinets/dist/index.js',
    'node_modules/@luxalgo/vela-pinets/dist/vela-pinets.global.js',
    'node_modules/@luxalgo/vela-pinets/dist/vela-pinets.global.min.js',
    'node_modules/pinets/dist/pinets.min.browser.es.js',
    'node_modules/pinets/dist/pinets.min.browser.js',
    'node_modules/pinets/dist/pinets.min.cjs',
    'node_modules/pinets/dist/pinets.min.es.js',
]

session_pattern = re.compile(r'if\(!(\w+)\)throw new \w+\(`Invalid session specification: "\$\{(\w+)\}"`,"time"\)')
params_pattern = re.compile(r'(\w+)\.params\[S\]\[(\w+)\]')

# 1. request.security timeframe resolution check
security_tf_pattern = re.compile(
    r'([a-zA-Z0-9_$]+)\s*=\s*([a-zA-Z0-9_$]+)\(([a-zA-Z0-9_$]+)\.timeframe\)\s*,\s*'
    r'([a-zA-Z0-9_$]+)\s*=\s*\2\(([a-zA-Z0-9_$]+)\)\s*;\s*'
    r'if\s*\(\s*!\1\s*\|\|\s*!\4\s*\)\s*throw\s+new\s+\w+\([^;]+timeframe[^;]+\);?'
)

# 2. security_lower_tf resolution check
security_lower_pattern = re.compile(
    r'([a-zA-Z0-9_$]+)\s*=\s*([a-zA-Z0-9_$]+)\(([a-zA-Z0-9_$]+)\.timeframe\)\s*,\s*'
    r'([a-zA-Z0-9_$]+)\s*=\s*\2\(([a-zA-Z0-9_$]+)\)\s*;\s*'
    r'if\s*\(\s*!\1\s*\|\|\s*!\4\s*\)\s*\{\s*(?:if\s*\([^)]+\)\s*return\s+NaN\s*;?\s*)?'
    r'throw\s+new\s+\w+\([^;]+security_lower_tf[^;]+\);?\s*\}'
)

# 3. this.timeframe assignment in classes
timeframe_assign_pattern = re.compile(r'this\.timeframe\s*=\s*([a-zA-Z0-9_$]+)([,;])')

const_let_pattern = re.compile(r'const\s+let\s+')

def patch_file(path):
    if not os.path.exists(path):
        return
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Clean const let
    content = const_let_pattern.sub('const ', content)

    # 1. Patch Invalid session specification
    def repl_session(m):
        v1, v2 = m.group(1), m.group(2)
        return f'if(!{v1}){{if(typeof {v2}==="string"&&({v2}.indexOf("/")!==-1||/^[a-zA-Z]/.test({v2})))return true;return false;}}'

    new_content, c1 = session_pattern.subn(repl_session, content)

    # 2. Patch request.security params[S][idx] undefined property access error
    def repl_params(m):
        ctx, idx = m.group(1), m.group(2)
        return f'(({ctx}.params&&{ctx}.params[S])?{ctx}.params[S][{idx}]:NaN)'

    new_content, c2 = params_pattern.subn(repl_params, new_content)

    # 3. Patch request.security timeframe
    def repl_sec(m):
        j_var, resolver, ctx, v_var, x_var = m.group(1), m.group(2), m.group(3), m.group(4), m.group(5)
        return f'{j_var} = {resolver}({ctx}.timeframe || "5") || {resolver}("5"), {v_var} = {resolver}({x_var}) || {j_var};'

    new_content, c3 = security_tf_pattern.subn(repl_sec, new_content)

    # 4. Patch security_lower_tf
    def repl_lower(m):
        x_var, resolver, ctx, v_var, p_var = m.group(1), m.group(2), m.group(3), m.group(4), m.group(5)
        return f'{x_var} = {resolver}({ctx}.timeframe || "5") || {resolver}("5"), {v_var} = {resolver}({p_var}) || {x_var}; if (!{x_var} || !{v_var}) return NaN;'

    new_content, c4 = security_lower_pattern.subn(repl_lower, new_content)

    # 5. Patch this.timeframe assignments
    def repl_tf_assign(m):
        val, sep = m.group(1), m.group(2)
        if val in ('""', "''", 'null', 'undefined'):
            return f'this.timeframe = "5"{sep}'
        return f'this.timeframe = ({val} || "5"){sep}'

    new_content, c5 = timeframe_assign_pattern.subn(repl_tf_assign, new_content)

    # 6. Fallback fixes for market.timeframe
    new_content = new_content.replace('opts.market().timeframe', '(opts.market()?.timeframe || "5")')
    new_content = re.sub(r'(?<!\.)\bmarket\.timeframe\b', '(market?.timeframe || "5")', new_content)

    # Clean any accidental syntax anomalies
    new_content = const_let_pattern.sub('const ', new_content)

    if c1 > 0 or c2 > 0 or c3 > 0 or c4 > 0 or c5 > 0 or new_content != content:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Patched {path}: session={c1}, params={c2}, sec={c3}, lower={c4}, tf_assign={c5}")
    else:
        print(f"No changes needed in {path}")

for t in targets:
    patch_file(t)
