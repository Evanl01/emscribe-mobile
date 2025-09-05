#!/bin/bash

# Script to verify archive configuration
echo "🔍 Verifying Archive Configuration..."

# Find the most recent archive
ARCHIVE_PATH=$(find ~/Library/Developer/Xcode/Archives -name "*.xcarchive" -type d | grep -i enscribe | head -1)

if [ -z "$ARCHIVE_PATH" ]; then
    echo "❌ No Enscribe archive found"
    exit 1
fi

echo "📦 Found archive: $ARCHIVE_PATH"

# Check the app bundle
APP_PATH="$ARCHIVE_PATH/Products/Applications/Enscribe.app"

if [ -d "$APP_PATH" ]; then
    echo "✅ App bundle found"
    
    # Check if Expo.plist exists and show configuration
    if [ -f "$APP_PATH/Expo.plist" ]; then
        echo "📋 Expo Configuration:"
        plutil -p "$APP_PATH/Expo.plist" | grep -E "(API_BASE_URL|ENVIRONMENT|DEBUG_MODE|NODE_ENV)"
        echo "📋 All Expo Config:"
        plutil -p "$APP_PATH/Expo.plist"
    else
        echo "❌ Expo.plist not found"
        echo "📋 Files in app bundle:"
        ls -la "$APP_PATH/"
    fi
    
    # Check Info.plist for build configuration hints
    if [ -f "$APP_PATH/Info.plist" ]; then
        echo "📋 Build Info:"
        plutil -p "$APP_PATH/Info.plist" | grep -E "(CFBundleVersion|CFBundleShortVersionString|DTSDKName|DTPlatformVersion)"
    fi
    
    # Check for main.jsbundle (React Native bundle)
    if [ -f "$APP_PATH/main.jsbundle" ]; then
        echo "📋 JS Bundle found - checking for environment strings:"
        strings "$APP_PATH/main.jsbundle" | grep -E "(production|development|API_BASE_URL)" | head -5
    fi
else
    echo "❌ App bundle not found in archive"
fi
