import { useState, useEffect } from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import type { EditorInfo } from '../shared/types'
import { api } from '../api/wails'

interface EditorPickerProps {
  projectPath: string
  onOpen: (projectPath: string, editor: string) => void
  trigger: React.ReactNode
}

import EditorIcon from './EditorIcon'

export default function EditorPicker({ projectPath, onOpen, trigger }: EditorPickerProps): JSX.Element {
  const [editors, setEditors] = useState<EditorInfo[]>([])

  useEffect(() => {
    api.getAvailableEditors().then(setEditors)
  }, [])

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        {trigger}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="editor-picker-dropdown"
          sideOffset={4}
          align="end"
        >
          {editors.map((e) => (
            <DropdownMenu.Item
              key={e.name}
              className="editor-picker-item"
              onClick={() => onOpen(projectPath, e.name)}
            >
              <EditorIcon name={e.name} />
              {e.label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
