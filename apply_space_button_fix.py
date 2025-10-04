#!/usr/bin/env python3
"""
Space Button Path Speed Control - Automated Implementation Script
Reads main.js and applies all the required changes for space button path speed control.
"""

import re

def apply_space_button_fix():
    # Read the current main.js file
    with open('main.js', 'r') as f:
        content = f.read()
    
    print("Applying space button path speed control fixes...")
    
    # 1. Remove Z-axis variables (lines 109-110)
    print("1. Removing Z-axis variables...")
    content = re.sub(
        r'  let sphereOffsetZ = 0; // Current Z offset from original position\n  let sphereVelocityZ = 0; // Z velocity for smooth movement\n',
        '',
        content
    )
    
    # 2. Replace space button logic (lines 232-241)
    print("2. Replacing space button logic...")
    old_space_logic = r'    // Space button adds forward acceleration \(negative Z direction - toward camera\)\n    if \(keysPressed\.space\) \{\n      const oldZVel = sphereVelocityZ;\n      sphereVelocityZ -= 0\.01; // Forward acceleration \(negative Z\)\n      \n      // Debug logging\n      if \(frameCount % 60 === 0\) \{\n        console\.log\(\'Space pressed - Z velocity:\', oldZVel\.toFixed\(4\), \'->\', sphereVelocityZ\.toFixed\(4\)\);\n      \}\n    \}'
    
    new_space_logic = '''    // Space button increases path movement speed
    if (keysPressed.space) {
      targetSpeed = 0.08; // Faster speed when space is held (was 0.04)
      
      // Debug logging
      if (frameCount % 60 === 0) {
        console.log('Space pressed - target speed:', targetSpeed.toFixed(4), 'current speed:', speed.toFixed(4));
      }
    } else {
      targetSpeed = 0.04; // Normal speed when space is not held
    }'''
    
    content = re.sub(old_space_logic, new_space_logic, content)
    
    # 3. Remove Z-axis friction
    print("3. Removing Z-axis friction...")
    content = re.sub(
        r'    // Apply friction to Z-axis when space is not pressed\n    if \(!keysPressed\.space\) \{\n      sphereVelocityZ \*= friction;\n    \}\n',
        '',
        content
    )
    
    # 4. Remove Z-axis speed limits
    print("4. Removing Z-axis speed limits...")
    content = re.sub(
        r'    // Limit maximum speed \(Z-axis\) - higher limits when boosting\n    const currentMaxZSpeed = keysPressed\.space \? maxSpeed \* 3\.0 : maxSpeed;\n    sphereVelocityZ = Math\.max\(-currentMaxZSpeed, Math\.min\(currentMaxZSpeed, sphereVelocityZ\)\);\n',
        '',
        content
    )
    
    # 5. Remove Z-axis offset updates
    print("5. Removing Z-axis offset updates...")
    content = re.sub(
        r'    // Update offset \(Z-axis\)\n    const oldZOffset = sphereOffsetZ;\n    sphereOffsetZ \+= sphereVelocityZ;\n    \n    // Debug Z offset changes\n    if \(frameCount % 60 === 0 && keysPressed\.space\) \{\n      console\.log\(\'Z offset:\', oldZOffset\.toFixed\(4\), \'->\', sphereOffsetZ\.toFixed\(4\)\);\n    \}\n',
        '',
        content
    )
    
    # 6. Remove Z-axis boundary limits
    print("6. Removing Z-axis boundary limits...")
    content = re.sub(
        r'    // Enforce maximum deviation from center \(Z-axis\)\n    if \(Math\.abs\(sphereOffsetZ\) > maxDeviation\) \{\n      sphereOffsetZ = Math\.sign\(sphereOffsetZ\) \* maxDeviation;\n      sphereVelocityZ = 0; // Stop at boundary\n    \}\n',
        '',
        content
    )
    
    # 7. Remove Z-axis from path system
    print("7. Removing Z-axis from path system...")
    content = re.sub(
        r'      targetPos\.z \+= sphereOffsetZ; // Apply Z offset for space button movement',
        '      // Z-axis removed - space button now controls path speed instead',
        content
    )
    
    # 8. Update debug logging
    print("8. Updating debug logging...")
    content = re.sub(
        r'      // Debug sphere position\n      if \(frameCount % 60 === 0 && keysPressed\.space\) \{\n        console\.log\(\'Sphere Z position:\', sphere\.position\.z\.toFixed\(4\)\);\n      \}',
        '''      // Debug path speed
      if (frameCount % 60 === 0 && keysPressed.space) {
        console.log('Sphere moving along path - speed:', speed.toFixed(4), 'target:', targetSpeed.toFixed(4));
      }''',
        content
    )
    
    # Write the modified content back to main.js
    with open('main.js', 'w') as f:
        f.write(content)
    
    print("✅ Space button path speed control implementation complete!")
    print("\nExpected behavior:
          "- Hold space → Sphere moves 2x faster along path
          "- Release space → Smooth deceleration to normal speed
          "- Debug → Shows speed values instead of Z-axis position")
          " 
          "Test by holding space and checking console for speed debug messages.")

if __name__ == "__main__":
    apply_space_button_fix()
