let cssContent = ''
let colorCSSContent = ''

let contentPromise = new Promise((resolve, reject) => {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.tabs.sendMessage(
      tabs[0].id,
      { message: 'fetch_content' },
      function (response) {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError.message)
          return
        }
        cssContent = response.cssData
        colorCSSContent = response.colorData
        resolve()
      },
    )
  })
})

window.addEventListener('load', () => {
  initializeButtons()
  contentPromise.then(() => showPreview())
})

function initializeButtons() {
  // 获取侧边栏按钮元素
  const sectionPreviewButton = document.getElementById(
    'dse-sidebar-sectionPreview',
  )
  const sectionCodeButton = document.getElementById('dse-sidebar-sectionCode')

  // 添加点击事件监听器
  sectionPreviewButton.addEventListener('click', showPreview)
  sectionCodeButton.addEventListener('click', showCode)
}

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
  contentPromise.then(() => createCodeContent())
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

function createCodeContent() {
  let fontStyleCSSContent = cssContent
  let colorCSSContentLocal = colorCSSContent

  const combinedCSSContent = `:root {

// Color Variables
${colorCSSContentLocal}
}

// Fontstyle
${fontStyleCSSContent}`

  // 更新文本框内容
  updateSidebarContent(combinedCSSContent)
}

function createPreviewContent() {
  const fontStyleCSSContent = cssContent
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
    const trimmedFontFamily = trimFontFamily(processedFontFamily)
    fontStyleDiv.className = 'fontStyleDiv'
    fontStyleDiv.innerHTML = `
    <div class="fontStyleListWrapper">
      <p>${match[1]}:</p>
      <p>${trimmedFontFamily}</p>
      <p>${match[4]}</p>
      <p>${match[5]}</p>
    </div>
    <div class="fontStylePreviewWrapper">
      <p style="font-family: ${processedFontFamily}; font-size: ${match[4]}; font-weight: ${match[5]}; line-height: ${match[6]}; letter-spacing: ${match[7]};">${match[2]}</p>
    </div>
    `
    fontStylePreviewContent.appendChild(fontStyleDiv)
  }
  // 这里开始处理颜色预览
  const colorPreviewContent = document.getElementById('colorPreviewContent')

  // generate color preview
  const colorRegEx = /(.*): (.*);\n/g
  let matchColor
  while ((matchColor = colorRegEx.exec(colorCSSContent))) {
    const colorDiv = document.createElement('div')
    colorDiv.innerHTML = `
    <div style="background-color: ${matchColor[2]};" class = "colorStyleDiv">
      <p>${matchColor[1]}</p>
      <p>${convertToHex(matchColor[2])}</p>
    </div>
    `
    // if the color is too dark, change the text color to white
    if (isColorDark(matchColor[2])) {
      colorDiv.style.color = '#ffffffcc'
    }
    colorPreviewContent.appendChild(colorDiv)
  }
}

function processFontFamily(fontFamilyString) {
  let families = fontFamilyString.replace(/"/g, "'")
  return families
}

// trim font family into the first one
function trimFontFamily(fontFamilyString) {
  let families = fontFamilyString
  return families.split(',')[0]
}

function updateSidebarContent(cssContent) {
  document.getElementById('myTextarea').value = cssContent
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
