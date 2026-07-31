import './content/static/css/readerControls.css'
import './content/static/css/content-theme-switch.css'
import './content/static/css/common.css'
import './content/static/css/content-copy.css'

import { initTheme } from './content/modules/content-theme'
import { initRightClick } from './content/modules/content-rightClick'
import { initCopy } from './content/modules/content-copy'

initTheme()
initRightClick()
initCopy()
