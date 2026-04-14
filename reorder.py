import sys

try:
    with open('src/pages/Dashboard.tsx', 'r', encoding='utf-8') as f:
        lines = f.readlines()

    # 1. Replace the broken image url
    for i in range(len(lines)):
        lines[i] = lines[i].replace('photo-1414235077428-33898dd14455', 'photo-1546069901-ba9599a7e63c')

    # 2. Extract the section
    start_idx = -1
    end_idx = -1
    for i, line in enumerate(lines):
        if '── Real Overpass Restaurants ──' in line:
            start_idx = i
        if '── Explore Popular Blocks ──' in line:
            end_idx = i
            break

    if start_idx != -1 and end_idx != -1:
        # Extract section (from start_idx to end_idx-1)
        section_lines = lines[start_idx:end_idx]
        
        # Remove from original location
        del lines[start_idx:end_idx]

        # 3. Find where to insert it: right before Realistic Hero Banner
        insert_idx = -1
        for i, line in enumerate(lines):
            if '── Realistic Hero Banner ──' in line:
                insert_idx = i
                break

        if insert_idx != -1:
            wrapper_start = ['      <div className=\"max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4\">\n']
            wrapper_end = ['      </div>\n\n']
            lines = lines[:insert_idx] + wrapper_start + section_lines + wrapper_end + lines[insert_idx:]
            
            with open('src/pages/Dashboard.tsx', 'w', encoding='utf-8') as f:
                f.writelines(lines)
            print('Successfully reordered the Dashboard and fixed the image!')
        else:
            print('Could not find Hero Banner insertion point.')
    else:
        print('Could not find the target section borders.')

except Exception as e:
    print('Error:', e)
