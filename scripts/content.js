window.addEventListener('load', () => {
  createDseSideBar()
  showPreview()
})

// Function to show the preview
function showPreview() {
  // 去掉#dse-sidebar-sectionPreview的active类
  const sectionCode = document.getElementById('dse-sidebar-sectionCode')
  sectionCode.classList.remove('active')
  // 给#dse-sidebar-sectionCode加上active类
  const sectionPreview = document.getElementById('dse-sidebar-sectionPreview')
  sectionPreview.classList.add('active')
  const content = document.getElementById('dse-sidebar-content')
  createPreviewStructure()
  createPreviewContent()
}

// Function to show the code
function showCode() {
  // 去掉#dse-sidebar-sectionPreview的active类
  const sectionPreview = document.getElementById('dse-sidebar-sectionPreview')
  sectionPreview.classList.remove('active')
  // 给#dse-sidebar-sectionCode加上active类
  const sectionCode = document.getElementById('dse-sidebar-sectionCode')
  sectionCode.classList.add('active')
  addCodeStructure()
  createCodeContent()
}

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

    // check the width and the height of the element, is not bigger than 2px, return
    const { width, height } = element.getBoundingClientRect()
    if (width < 2 || height < 2) {
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
  // 创建侧边栏的HTML代码
  const sidebarHTML = `
<div id="mySidebar">
  <div id="dse-sidebar-header">
    <button id="dse-sidebar-sectionPreview">Style Preview</button>
    <button id="dse-sidebar-sectionCode">Code</button>
  </div>
  <div id="dse-sidebar-content"></div>
</div>
`

  // 将侧边栏的HTML代码插入到<body>元素中
  document.body.insertAdjacentHTML('beforeend', sidebarHTML)

  // 获取侧边栏按钮元素
  const sectionPreviewButton = document.getElementById(
    'dse-sidebar-sectionPreview',
  )
  const sectionCodeButton = document.getElementById('dse-sidebar-sectionCode')

  // 添加点击事件监听器
  sectionPreviewButton.addEventListener('click', showPreview)
  sectionCodeButton.addEventListener('click', showCode)
}

function addCodeStructure() {
  const contentHTML = `
    <div id="dse-sidebar-control-bar">
      <div id="dse-sidebar-control-bar-title">
        <p>CSS Code:</p>
      </div>
      <div id="dse-sidebar-control-bar-buttons">
        <button id="dse-sidebar-copy-button">
          <img src="${chrome.runtime.getURL('images/copy-icon.svg')}">
        </button>
        <button id="dse-sidebar-download-button">
          <img src="${chrome.runtime.getURL('images/download-icon.svg')}">
        </button>
      </div>
    </div>
    <textarea id="myTextarea"></textarea>
  `
  // 将内容HTML代码插入到侧边栏内容中
  const sidebarContent = document.getElementById('dse-sidebar-content')
  sidebarContent.innerHTML = contentHTML
}

function createCodeContent() {
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

      controlBarTitle.appendChild(tooltip)

      // remove the tooltip after 3 seconds
      setTimeout(() => {
        controlBarTitle.removeChild(tooltip)
      }, 1500)

      // clean up and remove the link
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    })
}

function createPreviewStructure() {
  const contentHTML = `
  <div id="fontStylePreview">
    <div id="fontStylePreviewTitle">
      <p>Font Styles</p>
    </div>
    <div id="fontStylePreviewContent">
    </div>
  </div>
  <div id="colorPreview">
    <div id="colorPreviewTitle">
      <p>Colors</p>
    </div>
    <div id="colorPreviewContent">
    </div>
  </div>
    `
  // 将内容HTML代码插入到侧边栏内容中
  const sidebarContent = document.getElementById('dse-sidebar-content')
  sidebarContent.innerHTML = contentHTML
}

function createPreviewContent() {
  const fontStyleCSSContent = generateFontStyleCSSContent()
  const fontStylePreviewContent = document.getElementById(
    'fontStylePreviewContent',
  )

  // generate font style preview
  const fontClassRegEx =
    /\.(\w+-\d+) {\s*\/\/example: (.+)\s*font-family: (.*);\s*font-size: (.*);\s*font-weight: (.*);\s*line-height: (.*);\s*letter-spacing: (.*);\s*}\n/g
  let match
  while ((match = fontClassRegEx.exec(fontStyleCSSContent))) {
    const fontStyleDiv = document.createElement('div')
    const processedFontFamily = processFontFamily(match[3])
    fontStyleDiv.className = 'fontStyleDiv'
    fontStyleDiv.innerHTML = `
    <div class="fontStyleListWrapper">
      <p>${match[1]}:</p>
      <p>${processedFontFamily}</p>
      <p>${match[4]}</p>
      <p>${match[5]}</p>
    </div>
    <div class="fontStylePreviewWrapper">
      <p style="font-family: ${processedFontFamily}; font-size: ${match[4]}; font-weight: ${match[5]}; line-height: ${match[6]}; letter-spacing: ${match[7]};">${match[2]}</p>
    </div>
    `
    fontStylePreviewContent.appendChild(fontStyleDiv)
  }
  generateColorVariableCSSContent().then((colorCSSContent) => {
    const colorPreviewContent = document.getElementById('colorPreviewContent')

    // generate color preview
    const colorRegEx = /(.*): (.*);\n/g
    let match
    while ((match = colorRegEx.exec(colorCSSContent))) {
      const colorDiv = document.createElement('div')
      colorDiv.innerHTML = `
      <div style="background-color: ${match[2]};" class = "colorStyleDiv">
        <p>${match[1]}</p>
        <p>${convertToHex(match[2])}</p>
      </div>
      `
      // if the color is too dark, change the text color to white
      if (isColorDark(match[2])) {
        colorDiv.style.color = '#ffffffcc'
        console.log('dark'+ match[2])
      }
      colorPreviewContent.appendChild(colorDiv)
    }
  })
}

function convertToHex(color) {
  color = color.replace(/\s/g, '')
  if (color.startsWith('#')) {
    // If the color is already in hexadecimal format, return it as it is.
    return color
  }
  let rgba
  if (color.startsWith('rgb')) {
    // If the color is in rgb or rgba format.
    rgba = color
      .match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(1|0?\.\d+))?\)$/)
      .slice(1, 4)
      .map(Number)
  } else if (color.startsWith('hsl')) {
    // If the color is in hsl or hsla format.
    const hsla = color
      .match(/^hsla?\((\d+),\s*(\d+)%?,\s*(\d+)%?(?:,\s*(1|0?\.\d+))?\)$/)
      .slice(1, 4)
      .map(Number)
    // Convert hsl to rgb
    let h = hsla[0] / 360
    let s = hsla[1] / 100
    let l = hsla[2] / 100

    let r, g, b
    if (s === 0) {
      r = g = b = l // achromatic
    } else {
      let hue2rgb = function hue2rgb(p, q, t) {
        if (t < 0) t += 1
        if (t > 1) t -= 1
        if (t < 1 / 6) return p + (q - p) * 6 * t
        if (t < 1 / 2) return q
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
        return p
      }

      let q = l < 0.5 ? l * (1 + s) : l + s - l * s
      let p = 2 * l - q
      r = hue2rgb(p, q, h + 1 / 3)
      g = hue2rgb(p, q, h)
      b = hue2rgb(p, q, h - 1 / 3)
    }

    rgba = [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)]
  } else {
    throw new Error('Unsupported color format:' + color)
  }

  // convert RGB values to Hex
  let hex = '#'
  for (let i = 0; i < 3; i++) {
    let hexComponent = rgba[i].toString(16)
    hex += hexComponent.length === 1 ? '0' + hexComponent : hexComponent
  }

  return hex
}

function isColorDark(color) {
  // convert the color to hex
  const hexColor = convertToHex(color)

  // convert the color to RGB
  const r = parseInt(hexColor.slice(1, 3), 16)
  const g = parseInt(hexColor.slice(3, 5), 16)
  const b = parseInt(hexColor.slice(5, 7), 16)

  // calculate the relative luminance according to the WCAG definition
  const sR = r / 255
  const sG = g / 255
  const sB = b / 255

  const lR = sR <= 0.03928 ? sR / 12.92 : ((sR + 0.055) / 1.055) ** 2.4
  const lG = sG <= 0.03928 ? sG / 12.92 : ((sG + 0.055) / 1.055) ** 2.4
  const lB = sB <= 0.03928 ? sB / 12.92 : ((sB + 0.055) / 1.055) ** 2.4

  const luminance = 0.2126 * lR + 0.7152 * lG + 0.0722 * lB

  // if the relative luminance is less than the threshold, return true (dark color)
  return luminance < 0.179
}

function updateSidebarContent(cssContent) {
  document.getElementById('myTextarea').value = cssContent
}

function processFontFamily(fontFamilyString) {
  let families = fontFamilyString.replace(/"/g, '').split(',')
  return families[0].trim()
}
