// DOM
const $result = document.querySelector('#results-div')
const $backspace = document.querySelector('.phone-backspace')
const $soundToggleBtn = document.querySelector('.phone-sound-toggle')
const $input = document.querySelector('#user-input')
const $clear = document.querySelector('#clear-btn')
const $check = document.querySelector('#check-btn')
const $dtmfInterface = document.querySelector('.dtmf-interface')

// polyfill
const AudioContext = window.AudioContext || window.webkitAudioContext || window.mozAudioContext

let isMuted = false // flag for mute button

// DTMF frequencies
const dtmfFrequencies = {
  1: { f1: 697, f2: 1209 },
  2: { f1: 697, f2: 1336 },
  3: { f1: 697, f2: 1477 },
  4: { f1: 770, f2: 1209 },
  5: { f1: 770, f2: 1336 },
  6: { f1: 770, f2: 1477 },
  7: { f1: 852, f2: 1209 },
  8: { f1: 852, f2: 1336 },
  9: { f1: 852, f2: 1477 },
  0: { f1: 941, f2: 1336 }
}

// REGEX USA number
const phoneRegex = /^(1\s?)?(\(\d{3}\)|\d{3})[\s-]?\d{3}[\s-]?\d{4}$/

class Tone {
  constructor(context, freq1, freq2) {
    this.context = context
    this.status = 0
    this.freq1 = freq1
    this.freq2 = freq2
    this.osc1 = null
    this.osc2 = null
    this.gainNode = null
    this.filter = null
    // ... (resto del constructor sin cambios)
    this.isMuted = false
  }
  //
  setMuted(muted) {
    this.isMuted = muted
    if (this.gainNode) {
      this.gainNode.gain.setValueAtTime(this.isMuted ? 0 : 0.25, this.context.currentTime)
    }
  }
  //

  async setup() {
    this.osc1 = new OscillatorNode(this.context, {
      frequency: this.freq1
    })
    this.osc2 = new OscillatorNode(this.context, {
      frequency: this.freq2
    })
    this.gainNode = new GainNode(this.context, {
      gain: 0.25
    })
    this.filter = new BiquadFilterNode(this.context, {
      type: 'lowpass',
      frequency: 400
    })

    this.osc1.connect(this.gainNode)
    this.osc2.connect(this.gainNode)
    this.gainNode.connect(this.filter)
    this.filter.connect(this.context.destination)

    if (this.context.state !== 'running') {
      await this.context.resume()
    }
  }

  async start() {
    if (this.status === 0) {
      await this.setup()
      this.osc1.frequency.setValueAtTime(this.freq1, this.context.currentTime)
      this.osc2.frequency.setValueAtTime(this.freq2, this.context.currentTime)
      //
      this.gainNode.gain.setValueAtTime(this.isMuted ? 0 : 0.25, this.context.currentTime)
      //
      this.osc1.start()
      this.osc2.start()
      this.status = 1
    } else {
      // Si ya está en ejecución, solo actualizamos las frecuencias
      this.osc1.frequency.setValueAtTime(this.freq1, this.context.currentTime)
      this.osc2.frequency.setValueAtTime(this.freq2, this.context.currentTime)
      //
      this.gainNode.gain.setValueAtTime(this.isMuted ? 0 : 0.25, this.context.currentTime)
      //
    }
  }

  stop() {
    if (this.status === 1) {
      this.osc1.stop()
      this.osc2.stop()
      this.osc1 = null
      this.osc2 = null
      this.status = 0
    }
  }
}

let context
let dtmf

const initAudioContext = () => {
  if (!context) {
    context = new AudioContext()
    dtmf = new Tone(context, 350, 440)
    //
    dtmf.setMuted(isMuted)
    //
  }
  return context
}
;['mousedown', 'touchstart'].forEach((eventType) => {
  $dtmfInterface.addEventListener(eventType, async (event) => {
    // Verifica si el elemento clicado es un botón
    if (event.target.matches('button')) {
      event.preventDefault()

      context = initAudioContext()

      const keyPressed = event.target.textContent.trim() // this gets the number/character that was pressed
      const frequencyPair = dtmfFrequencies[keyPressed] // this looks up which frequency pair we need

      if (frequencyPair) {
        // this sets the freq1 and freq2 properties
        dtmf.freq1 = frequencyPair.f1
        dtmf.freq2 = frequencyPair.f2

        if (dtmf.status == 0) {
          await dtmf.start()
        }
      }
    }
  })
})

// Agregando un event listener para las teclas del teclado
document.addEventListener('keydown', async (event) => {
  const keyPressed = event.key

  // Verifica si la tecla presionada es un número
  if (dtmfFrequencies[keyPressed]) {
    const maxLength = $input.maxLength

    event.preventDefault()

    context = initAudioContext()
    $input.value = ($input.value + keyPressed).slice(0, maxLength)

    const frequencyPair = dtmfFrequencies[keyPressed] // busca el par de frecuencias

    // establece las propiedades freq1 y freq2
    dtmf.freq1 = frequencyPair.f1
    dtmf.freq2 = frequencyPair.f2

    if (dtmf.status == 0) {
      await dtmf.start()
    }
  }
})

// prettier-ignore
;['mouseup', 'touchend', 'touchcancel', 'keyup'].forEach((eventType) => {
  // we detect the mouseup event on the window tag as opposed to the buttons
  // because otherwise if we release the mouse when not over a button,
  // the tone will remain playing
  window.addEventListener(eventType, () => {
    if (dtmf) {
      dtmf.stop()
    }
  })
})

// phone buttons numbers functionality
const updateInput = (value) => {
  // obtiene el maxlength establecido en el elemento input
  const maxLength = $input.maxLength
  // concatena el nuevo valor al ya existente en el input y no permite que exceda el maxlength permitido
  $input.value = ($input.value + value).slice(0, maxLength)
}

;['touchstart', 'click'].forEach((eventType) => {
  $dtmfInterface.addEventListener(eventType, (event) => {
    if (event.target.matches('button')) {
      const buttonValue = event.target.textContent.trim()
      updateInput(buttonValue)
    }
  })
})

$dtmfInterface.addEventListener('touchmove', (event) => {
  event.preventDefault()
})

// button clear functionality
$clear.addEventListener('click', async () => {
  $result.textContent = ''
  $input.value = ''
  await new Promise((resolve) => setTimeout(resolve, 1000))
  $result.textContent = 'Dial a phone number'
})

// backspace button functionality
$backspace.addEventListener('click', () => ($input.value = $input.value.slice(0, -1)))

const checkNumber = (number) => {
  return phoneRegex.test(number)
}

$check.addEventListener('click', () => {
  if ($input.value.trim() == '') {
    alert('Please provide a phone number')
  } else {
    if (checkNumber($input.value)) {
      $result.textContent = `Valid US number: ${$input.value}`
    } else {
      $result.textContent = `Invalid US number: ${$input.value}`
    }
  }
})

// button sound toggle functionality

const updateSoundToggleUI = () => {
  document.getElementById('unmute-icon').style.display = isMuted ? 'none' : 'block'
  document.getElementById('mute-icon').style.display = isMuted ? 'block' : 'none'
}

const toggleSound = () => {
  isMuted = !isMuted
  updateSoundToggleUI()

  if (dtmf) {
    dtmf.setMuted(isMuted)
  }
  console.log('Sound is now ' + (isMuted ? 'muted' : 'unmuted'))
}

$soundToggleBtn.addEventListener('click', toggleSound)
updateSoundToggleUI()
