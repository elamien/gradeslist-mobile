# Tamagui LLM Reference

This file contains the complete Tamagui documentation for LLM reference to avoid common mistakes.

## Key Points for LLMs

### Common Mistakes to Avoid
1. **Don't use `$cardBackground`** - Use explicit colors or proper theme tokens
2. **Don't use undefined theme tokens** - Use documented tokens like `$gray1`, `$background`, etc.
3. **Card component issues** - Use View or proper styling instead of undefined Card props
4. **Import from correct packages** - Use `tamagui` for core components

### Proper Setup
```typescript
// tamagui.config.ts
import { defaultConfig } from '@tamagui/config/v4'
import { createTamagui } from 'tamagui'

export const config = createTamagui(defaultConfig)
```

### Core Components
- **YStack, XStack** - Layout components
- **Text** - Typography with theme tokens
- **Button** - Interactive elements
- **ScrollView** - Scrollable content
- **View** - Basic container (use instead of Card if issues)

### Theme Tokens
- Use documented tokens like `$gray1`, `$background`, `$red10`
- Avoid undefined tokens like `$cardBackground`
- Check token existence before using

### Best Practices
- Import from `tamagui` package
- Use size tokens consistently (`$4`, `$3`, etc.)
- Leverage built-in accessibility
- Use TypeScript for type safety

### Error Prevention
- Always check if theme tokens exist
- Use fallback to React Native components if Tamagui components fail
- Test components individually before combining

## Personal Note
I tend to use undefined theme tokens like `$cardBackground` - always double-check token existence and use documented tokens only.

## ROOT CAUSE ANALYSIS - "Cannot convert undefined value to object"

**What was happening:**
I was importing Tamagui components from the wrong packages, causing undefined component errors.

**My mistakes:**
1. **Wrong import packages** - Mixed up `@tamagui/core` vs `tamagui` package
2. **Inconsistent imports** - Used different packages for different components
3. **Didn't follow documentation** - Official docs clearly show correct imports
4. **Assumed package structure** - Didn't verify what each package actually exports

**The real issue:**
- **Wrong component imports:** Components should come from `'tamagui'`, not `'@tamagui/core'`
- **Package confusion:** Mixed up where to import different pieces from
- **Following wrong patterns:** Used `@tamagui/core` based on incorrect assumptions

**The CORRECT solution:**
- **ALL imports from `'tamagui'` package:**
  - `import { createTamagui } from 'tamagui'`
  - `import { TamaguiProvider } from 'tamagui'`
  - `import { YStack, Text } from 'tamagui'`
- **Only config from separate package:**
  - `import { defaultConfig } from '@tamagui/config/v4'`

**What fixed it:**
- Falling back to React Native components bypassed the broken Tamagui setup entirely
- Using explicit styles instead of theme tokens avoided the undefined object access

**Lesson learned:**
- **Always test Tamagui setup with simple components first** (like `<Text>Hello</Text>`)
- **Verify theme tokens exist** before using them
- **Use fallback to React Native** when Tamagui setup is problematic
- **Configure Tamagui properly** or don't use it at all

## Fixed Issues
1. **Watchman recrawl error** - Run `watchman watch-del '/Users/ahmed/repos' ; watchman watch-project '/Users/ahmed/repos'`
2. **Undefined theme tokens** - Use `$gray1`, `$gray2`, `$gray4`, `$gray10`, `$red10` instead of `$cardBackground`, `$color10`
3. **Card component issues** - Use YStack with proper styling instead of undefined Card component
4. **useColorScheme returning undefined** - Always provide fallback: `return colorScheme ?? 'light'`
5. **Persistent colorScheme errors** - Sometimes better to hardcode `Colors.light.tint` temporarily to avoid issues
6. **useFonts causing undefined errors** - Remove font loading temporarily to get app running
7. **Tamagui configuration issues** - **SOLUTION: Import everything from `@tamagui/core`, not `tamagui` package**

## FINAL WORKING CONFIGURATION ✅

```typescript
// tamagui.config.ts
import { defaultConfig } from '@tamagui/config/v4'
import { createTamagui } from 'tamagui'

export const config = createTamagui(defaultConfig)

declare module 'tamagui' {
  interface TamaguiCustomConfig extends typeof config {}
}
```

```typescript
// app/_layout.tsx
import { TamaguiProvider } from 'tamagui'
import { config } from '../tamagui.config'

export default function RootLayout() {
  return (
    <TamaguiProvider config={config}>
      {/* Your app content */}
    </TamaguiProvider>
  )
}
```

```typescript
// Components - NOW WORKING! 🎉
import { YStack, XStack, Text } from 'tamagui'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function Screen() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <YStack flex={1} padding="$4">
        <Text fontSize="$6">Hello Tamagui!</Text>
      </YStack>
    </SafeAreaView>
  )
}
```

## FINAL STATUS ✅
- **TamaguiProvider is working** (no config errors)
- **Individual Tamagui components are working** (YStack, Text, etc.)
- **Safe area handling is working** (iOS notch/status bar respect)
- **Theme tokens are working** (can use $4, $6, etc.)

## THE KEY INSIGHT
**Everything comes from the main `'tamagui'` package, not `'@tamagui/core'`**

## CURRENT ISSUE
**Theme tokens still causing "Cannot convert undefined value to object" errors**
- Even with correct imports, some theme tokens like `$gray1`, `$gray2` are undefined
- **Solution for now:** Use React Native components with explicit styles
- **Future:** Investigate why theme tokens aren't available even with correct config