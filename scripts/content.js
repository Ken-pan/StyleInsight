window.addEventListener('load', () => {
  const controlBarTitle = createDseSideBar()
  createDseContent()

  // generate button
  document.getElementById('myButton').addEventListener('click', () => {
    createDseContent()
  })

  // copy button
  document
    .getElementById('dse-sidebar-copy-button')
    .addEventListener('click', () => {
      const textarea = document.getElementById('myTextarea')
      textarea.select()
      document.execCommand('copy')
      // unselect the textarea
      textarea.blur()

      // create a tooltip
      const tooltip = document.createElement('div')
      tooltip.id = 'dse-sidebar-tooltip'
      tooltip.textContent = 'Copied!'
      tooltip.style.backgroundColor = 'hsla(94, 100%, 40%, 0.1)'
      tooltip.style.color = '#5ACC00'
      tooltip.style.fontWeight = 'bold'
      tooltip.style.fontSize = '12px'
      tooltip.style.padding = '4px 8px'
      tooltip.style.borderRadius = '4px'
      tooltip.style.margin = '0'

      controlBarTitle.appendChild(tooltip)

      // remove the tooltip after 3 seconds
      setTimeout(() => {
        controlBarTitle.removeChild(tooltip)
      }, 1500)
    })

  // download button
  document
    .getElementById('dse-sidebar-download-button')
    .addEventListener('click', () => {
      // Create a css file from myTextarea and download it
      const cssContent = document.getElementById('myTextarea').value
      const blob = new Blob([cssContent], { type: 'text/css' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')

      // set attributes and click to download
      a.href = url
      a.download = 'styles.css' // or whatever name you want
      a.style.display = 'none'

      // append link to the body
      document.body.appendChild(a)
      a.click()

      // create a tooltip
      const tooltip = document.createElement('div')
      tooltip.id = 'dse-sidebar-tooltip'
      tooltip.textContent = 'Downloaded!'
      tooltip.style.backgroundColor = 'hsla(94, 100%, 40%, 0.1)'
      tooltip.style.color = '#5ACC00'
      tooltip.style.fontWeight = 'bold'
      tooltip.style.fontSize = '12px'
      tooltip.style.padding = '4px 8px'
      tooltip.style.borderRadius = '4px'
      tooltip.style.margin = '0'

      controlBarTitle.appendChild(tooltip)

      // remove the tooltip after 3 seconds
      setTimeout(() => {
        controlBarTitle.removeChild(tooltip)
      }, 1500)

      // clean up and remove the link
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    })
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
    'body-text': 0,
    caption: 0,
  }

  textInfo.forEach((info) => {
    let className
    const fontSize = parseInt(info.fontSize)
    if (fontSize >= 17) {
      className = 'headline'
    } else if (fontSize >= 13 && fontSize < 17) {
      className = 'body-text'
    } else {
      className = 'caption'
    }

    classCount[className]++

    const cssString = `\n.${className}-${classCount[className]} {
  //example: ${info.text}
  font-family: ${info.fontFamily};
  font-size: ${info.fontSize};
  font-weight: ${info.fontWeight};
  line-height: ${info.lineHeight};
  letter-spacing: ${info.letterSpacing};
}
`
    cssContent += cssString
  })

  return cssContent
}

async function generateColorVariableCSSContent() {
  let colorCSSContent = '// Color Variables\n'
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

  return colorCSSContent
}

function createDseSideBar() {
  const sidebar = document.createElement('div')
  sidebar.id = 'mySidebar'
  sidebar.style.position = 'fixed'
  sidebar.style.right = '0'
  sidebar.style.top = '0'
  sidebar.style.width = '400px'
  sidebar.style.height = '100vh'
  sidebar.style.backgroundColor = '#181818'
  sidebar.style.overflowY = 'auto'
  sidebar.style.zIndex = '9999'
  sidebar.style.borderLeft = '1px solid #333'

  const header = document.createElement('div')
  header.id = 'dse-sidebar-header'
  header.style.display = 'flex'
  header.style.height = '50px'
  header.style.width = '100%'
  header.style.justifyContent = 'space-between'
  header.style.alignItems = 'center'
  header.style.marginBottom = '16px'
  header.style.padding = '0 16px'
  header.style.borderBottom = '1px solid #333'
  header.style.boxSizing = 'border-box'

  const title = document.createElement('div')
  title.id = 'dse-sidebar-title'
  title.textContent = 'StyleInsight'
  title.style.color = '#FFFFFFCC'
  title.style.fontSize = '16px'
  title.style.fontWeight = 500
  title.style.height = '20px'

  const closeButton = document.createElement('button')
  closeButton.id = 'dse-sidebar-close-button'
  closeButton.style.width = '32px'
  closeButton.style.height = '32px'
  closeButton.style.borderRadius = '50%'
  closeButton.style.border = 'none'
  closeButton.style.cursor = 'pointer'
  closeButton.style.display = 'flex'
  closeButton.style.justifyContent = 'center'
  closeButton.style.alignItems = 'center'
  closeButton.style.backgroundColor = 'transparent'
  closeButton.style.boxSizing = 'border-box'

  const closeIcon = document.createElement('img')
  closeIcon.src = chrome.runtime.getURL('images/close-icon.svg')
  closeIcon.style.width = '16px'
  closeIcon.style.height = '16px'
  closeIcon.style.color = '#FFFFFFCC'
  // closeIcon.style.display = 'none';

  header.appendChild(title)
  header.appendChild(closeButton)
  closeButton.appendChild(closeIcon)
  sidebar.appendChild(header)

  const content = document.createElement('div')
  content.id = 'dse-sidebar-content'
  content.style.padding = '0px'
  content.style.margin = '0 16px'
  content.style.border = '1px solid #333'
  content.style.borderRadius = '4px'
  content.style.backgroundColor = '#242424'
  content.style.height = 'calc(100% - 129.5px)'
  content.style.marginBottom = '8px'
  sidebar.appendChild(content)

  const controlBar = document.createElement('div')
  controlBar.id = 'dse-sidebar-control-bar'
  controlBar.style.display = 'flex'
  controlBar.style.height = '40px'
  controlBar.style.width = '100%'
  controlBar.style.justifyContent = 'space-between'
  controlBar.style.alignItems = 'center'
  controlBar.style.padding = '0 8px'
  controlBar.style.borderBottom = '1px solid #333'
  controlBar.style.boxSizing = 'border-box'

  content.appendChild(controlBar)

  const controlBarTitle = document.createElement('div')
  controlBarTitle.id = 'dse-sidebar-control-bar-title'
  controlBarTitle.style.display = 'flex'
  controlBarTitle.style.justifyContent = 'center'
  controlBarTitle.style.alignItems = 'center'
  controlBarTitle.style.gap = '4px'

  const controlBarTitleText = document.createElement('p')
  controlBarTitleText.textContent = 'CSS Code:'
  controlBarTitleText.style.color = '#FFFFFFCC'
  controlBarTitleText.style.fontSize = '12px'
  controlBarTitleText.style.fontWeight = 400
  controlBarTitleText.style.height = '16px'
  controlBarTitle.appendChild(controlBarTitleText)

  const controlBarButtons = document.createElement('div')
  controlBarButtons.id = 'dse-sidebar-control-bar-buttons'
  controlBarButtons.style.display = 'flex'
  controlBarButtons.style.alignItems = 'center'
  controlBarButtons.style.height = '100%'

  controlBar.appendChild(controlBarTitle)
  controlBar.appendChild(controlBarButtons)

  const copyButton = document.createElement('button')
  copyButton.id = 'dse-sidebar-copy-button'
  copyButton.style.width = '24px'
  copyButton.style.height = '24px'
  copyButton.style.borderRadius = '50%'
  copyButton.style.border = 'none'
  copyButton.style.cursor = 'pointer'
  copyButton.style.display = 'flex'
  copyButton.style.justifyContent = 'center'
  copyButton.style.alignItems = 'center'
  copyButton.style.backgroundColor = 'transparent'

  controlBarButtons.appendChild(copyButton)

  const copyIcon = document.createElement('img')
  copyIcon.src = chrome.runtime.getURL('images/copy-icon.svg')
  copyIcon.style.width = '16px'
  copyIcon.style.height = '16px'
  copyIcon.style.color = '#FFFFFFCC'

  copyButton.appendChild(copyIcon)

  const downloadButton = document.createElement('button')
  downloadButton.id = 'dse-sidebar-download-button'
  downloadButton.style.width = '24px'
  downloadButton.style.height = '24px'
  downloadButton.style.borderRadius = '50%'
  downloadButton.style.border = 'none'
  downloadButton.style.cursor = 'pointer'
  downloadButton.style.display = 'flex'
  downloadButton.style.justifyContent = 'center'
  downloadButton.style.alignItems = 'center'
  downloadButton.style.backgroundColor = 'transparent'

  const downloadIcon = document.createElement('img')
  downloadIcon.src = chrome.runtime.getURL('images/download-icon.svg')
  downloadIcon.style.width = '16px'
  downloadIcon.style.height = '16px'
  downloadIcon.style.color = '#FFFFFFCC'

  controlBarButtons.appendChild(downloadButton)
  downloadButton.appendChild(downloadIcon)

  const textarea = document.createElement('textarea')
  textarea.id = 'myTextarea'
  textarea.style.width = '100%'
  textarea.style.padding = '8px'
  textarea.style.backgroundColor = '#242424'
  textarea.style.color = '#FFFFFFCC'
  textarea.style.resize = 'none'
  textarea.style.height = 'calc(100% - 40px)'
  textarea.style.border = 'none'
  textarea.style.borderRadius = '0'
  textarea.style.boxSizing = 'border-box'
  content.appendChild(textarea)

  const button = document.createElement('button')
  button.id = 'myButton'
  button.textContent = 'Generate Style of this site'
  button.style.padding = '10px'
  button.style.backgroundColor = '#0A66C2'
  button.style.color = '#fff'
  button.style.marginBottom = '20px'
  button.style.borderRadius = '4px'
  button.style.fontWeight = 'bold'
  button.style.border = 'none'
  button.style.cursor = 'pointer'
  button.style.marginLeft = '16px'
  button.style.marginRight = '16px'
  button.style.width = 'calc(100% - 32px)'
  sidebar.appendChild(button)

  document.body.appendChild(sidebar)
  return controlBarTitle
}

function updateSidebarContent(cssContent) {
  document.getElementById('myTextarea').value = cssContent
}

function createDseContent() {
  let fontStyleCSSContent = generateFontStyleCSSContent()
  let colorCSSContentPromise = generateColorVariableCSSContent()
  colorCSSContentPromise.then((colorCSSContent) => {
    const cssContent = `:root {
${colorCSSContent}
}


// Fontstyle
${fontStyleCSSContent}`
    // 更新文本框内容
    updateSidebarContent(cssContent)
  })
}
