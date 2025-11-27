import re
import os

html_path = r"C:\Users\Nicks\Desktop\Flyx-main\scripts\reverse-engineering\dlhd-stream.html"
output_path = r"C:\Users\Nicks\Desktop\Flyx-main\scripts\reverse-engineering\decoder_parts.js"

def extract_decoder():
    with open(html_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Extract _0x8b05 function
    match_8b05 = re.search(r"function _0x8b05\(\)\{.*?return _0x8b05\(\);\}", content)
    if not match_8b05:
        print("Could not find _0x8b05 function")
        return

    func_8b05 = match_8b05.group(0)

    # Extract _0xb4a0 function
    # It seems to be defined as function _0xb4a0(_0x447697,_0x51a3a4){...}
    # We need to capture the full body. It usually ends with },_0xb4a0(_0x447697,_0x51a3a4);}
    # or just a matching brace.
    # Let's try to match the start and then find the matching brace or use a greedy regex if it's on one line.
    # Based on the view, it seems to be on one line.
    match_b4a0 = re.search(r"function _0xb4a0\([a-zA-Z0-9_,]+\)\{.*?_0xb4a0\([a-zA-Z0-9_,]+\)\;\}", content)
    if not match_b4a0:
        # Try alternative pattern if the previous one was too specific about the end
        match_b4a0 = re.search(r"function _0xb4a0\([a-zA-Z0-9_,]+\)\{.*?return _0x8b0550\[t\];\}", content)
        
    if not match_b4a0:
         # Fallback: assume it's followed by the shuffle IIFE
        start_idx = content.find("function _0xb4a0")
        if start_idx != -1:
            end_idx = content.find("(function(_0x9dcbec", start_idx)
            if end_idx != -1:
                func_b4a0 = content[start_idx:end_idx]
            else:
                print("Could not find end of _0xb4a0")
                return
        else:
            print("Could not find _0xb4a0 function")
            return
    else:
        func_b4a0 = match_b4a0.group(0)

    # Extract Shuffle IIFE
    # (function(_0x9dcbec,_0x4ab1b0){...}(_0x8b05,0x58bbd));
    match_shuffle = re.search(r"\(function\(_0x9dcbec,_0x4ab1b0\)\{.*?\(_0x8b05,0x[0-9a-f]+\)\)\;", content)
    if not match_shuffle:
        print("Could not find shuffle IIFE")
        # Try to find it by start and end
        start_idx = content.find("(function(_0x9dcbec")
        if start_idx != -1:
            # It ends with ));
            # But there might be nested parens.
            # It seems to be followed by ,!(function
            end_idx = content.find(",!(function", start_idx)
            if end_idx != -1:
                shuffle_iife = content[start_idx:end_idx]
            else:
                print("Could not find end of shuffle IIFE")
                return
        else:
            return
    else:
        shuffle_iife = match_shuffle.group(0)

    # Extract Config String
    match_config = re.search(r"window\['ZpQw9XkLmN8c3vR3'\]='(.*?)';", content)
    if not match_config:
        print("Could not find config string")
        return
    
    config_str = match_config.group(1)

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(func_8b05 + "\n")
        f.write(func_b4a0 + "\n")
        f.write(shuffle_iife + "\n")
        f.write(f"const configString = '{config_str}';\n")
        f.write("module.exports = { _0xb4a0, configString };\n")

    print(f"Successfully extracted decoder parts to {output_path}")

if __name__ == "__main__":
    extract_decoder()
