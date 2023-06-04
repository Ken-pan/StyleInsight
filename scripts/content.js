// content_script.js
chrome.runtime.onMessage.addListener(async function (
  request,
  sender,
  sendResponse,
) {
  if (request.message === 'fetch_content') {
    let cssContent = generateFontStyleCSSContent()
    let colorCSSContent = await generateColorVariableCSSContent()
    console.log(colorCSSContent)
    sendResponse({ cssData: cssContent, colorData: colorCSSContent })
  }
  return true
})

// scan all text elements and generate CSS content
function scanTextElements() {
  const textElements = document.querySelectorAll(
    'body p, body h1, body h2, body h3, body h4, body a, body span, body div, body li, body ol',
  )

  const textInfo = []

  textElements.forEach((element) => {
    // return is elemtent has children
    if (element.children.length > 0) {
      return
    }

    const { fontSize, fontFamily, fontWeight, lineHeight, letterSpacing } =
      window.getComputedStyle(element)

    // check if the element is valid UI text
    if (!element.textContent.trim()) {
      return
    }
    if (
      element.textContent.trim().startsWith('{') ||
      element.textContent.trim().startsWith('[') ||
      element.textContent.trim().startsWith('(')
    ) {
      return
    }
    if (parseFloat(fontSize) === 0) {
      return
    }

    const { width, height } = element.getBoundingClientRect()
    if (width < 2 || height < 2) {
      return
    }

    // return if this element is a child of #mySidebar
    if (element.closest('#mySidebar')) {
      return
    }

    // change font-family to SF Pro if it's -apple-system
    const updatedFontFamily = fontFamily.startsWith('-apple-system')
      ? 'SF Pro'
      : fontFamily

    const newTextInfo = {
      text: element.textContent.trim(),
      fontSize,
      fontFamily: updatedFontFamily,
      fontWeight,
      lineHeight,
      letterSpacing,
    }

    //  Truncate the text if it is longer than 20 characters
    if (newTextInfo.text.length > 20) {
      newTextInfo.text = newTextInfo.text
        .replace(/\n/g, '')
        .replace(/\s\s+/g, ' ')
      newTextInfo.text = `${newTextInfo.text.slice(0, 20)}...`
    }

    // check if the text info is duplicate
    const isDuplicate = textInfo.some((info) => {
      return (
        info.fontSize === newTextInfo.fontSize &&
        info.fontFamily === newTextInfo.fontFamily &&
        info.fontWeight === newTextInfo.fontWeight
      )
    })

    if (!isDuplicate) {
      textInfo.push(newTextInfo)
    }
  })

  // sort text info by font size and font weight
  textInfo.sort((a, b) => {
    const fontSizeDiff = parseInt(b.fontSize) - parseInt(a.fontSize)
    if (fontSizeDiff !== 0) {
      return fontSizeDiff
    } else {
      const fontWeightDiff = parseFloat(b.fontWeight) - parseFloat(a.fontWeight)
      return fontWeightDiff
    }
  })

  return textInfo
}

// generate CSS content
function generateFontStyleCSSContent() {
  const textInfo = scanTextElements()
  let cssContent = ''

  const classCount = {
    headline: 0,
    bodytext: 0,
    caption: 0,
  }

  textInfo.forEach((info) => {
    let className
    const fontSize = parseInt(info.fontSize)
    if (fontSize >= 17) {
      className = 'headline'
    } else if (fontSize >= 13 && fontSize < 17) {
      className = 'bodytext'
    } else {
      className = 'caption'
    }

    classCount[className]++

    const cssString = `.${className}-${classCount[className]} {
  //example: ${info.text}
  font-family: ${info.fontFamily};
  font-size: ${info.fontSize};
  font-weight: ${info.fontWeight};
  line-height: ${info.lineHeight};
  letter-spacing: ${info.letterSpacing};
}\n
`
    cssContent += cssString
  })

  return cssContent
}

async function generateColorVariableCSSContent() {
  let colorCSSContent = ''
  const addedColors = new Set()
  const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/

  const styleSheets = Array.from(document.styleSheets)

  const colorVariables = {}

  const isValidColor = (strColor) => {
    const s = new Option().style
    s.color = strColor
    return s.color !== ''
  }

  for (const styleSheet of styleSheets) {
    let rules = []
    try {
      rules = Array.from(styleSheet.cssRules)
    } catch (e) {
      console.error('Error accessing rules of stylesheet', e)
    }
    const rootRule = rules.find((rule) => rule.selectorText === ':root')
    if (rootRule) {
      for (let i = 0; i < rootRule.style.length; i++) {
        const property = rootRule.style[i]
        const value = rootRule.style.getPropertyValue(property)
        if (
          property.startsWith('--') &&
          (value.includes('hsl') ||
            value.includes('rgb') ||
            hexColorRegex.test(value)) &&
          isValidColor(value)
        ) {
          colorVariables[property] = value
        }
      }
    }
  }

  for (const key in colorVariables) {
    let value = colorVariables[key]
    while (value.startsWith('var(')) {
      const variableName = value.slice(4, -1).trim()
      value = colorVariables[variableName] || value
    }
    if (
      !addedColors.has(value) &&
      (value.includes('hsl') ||
        value.includes('rgb') ||
        hexColorRegex.test(value)) &&
      isValidColor(value)
    ) {
      colorCSSContent += `${key}: ${value};\n`
      addedColors.add(value)
    }
  }
  console.log(colorCSSContent)
  return colorCSSContent
}
