'use client'

import "@blocknote/core/fonts/inter.css";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import "@blocknote/shadcn/style.css";
import { BlockNoteSchema, defaultBlockSpecs } from '@blocknote/core'
import { SuggestionMenuController, getDefaultReactSlashMenuItems, type DefaultReactSuggestionItem, SideMenuController, SideMenu, DragHandleMenu, type DragHandleMenuProps, RemoveBlockItem, BlockColorsItem } from '@blocknote/react'
import { ChartSettingsItem } from '@/components/blocks/ChartSettingsItem'
import { useEffect } from 'react'
import { TrendingUp } from 'lucide-react'
import { createChartBlock } from '@/components/blocks/chart-block'

export default function ClientBlockNote() {
  const editor = useCreateBlockNote({
    schema: BlockNoteSchema.create({
      blockSpecs: {
        ...defaultBlockSpecs,
        chart: createChartBlock(),
      },
    }),
  });

  // Extend dictionary AFTER editor is created so we keep all default keys intact.
  useEffect(() => {
    if (!editor) return
    ;(editor as any).dictionary = {
      ...((editor as any).dictionary || {}),
      multi_column: {
        ...(((editor as any).dictionary || {}).multi_column || {}),
        slash_menu: {
          ...((((editor as any).dictionary || {}).multi_column || {}).slash_menu || {}),
          two_columns: {
            title: 'Two columns',
            aliases: ['2 columns'],
            subtext: 'Insert a 2-column layout',
          },
          three_columns: {
            title: 'Three columns',
            aliases: ['3 columns'],
            subtext: 'Insert a 3-column layout',
          },
        },
      },
    }
  }, [editor])
  return (
    <BlockNoteView editor={editor} theme="light" slashMenu={false} sideMenu={false}>
      {/* Custom Side Menu with Drag Handle Menu item */}
      <SideMenuController
        sideMenu={(props) => (
          <SideMenu
            {...props}
            dragHandleMenu={(menuProps: DragHandleMenuProps) => (
              (menuProps.block as any).type === 'chart' ? (
                <DragHandleMenu {...menuProps}>
                  {/* keep common defaults and add our item */}
                  <RemoveBlockItem {...menuProps}>Delete</RemoveBlockItem>
                  <BlockColorsItem {...menuProps}>Colors</BlockColorsItem>
                  <ChartSettingsItem {...menuProps} />
                </DragHandleMenu>
              ) : (
                // use default menu for non-chart blocks
                <DragHandleMenu {...menuProps} />
              )
            )}
          />
        )}
      />
      <SuggestionMenuController
        triggerCharacter="/"
        getItems={async (query: string) => {
          const custom: DefaultReactSuggestionItem = {
            title: 'Chart',
            subtext: 'Insert a line chart',
            group: 'Charts',
            icon: <TrendingUp className="h-4 w-4" />,
            onItemClick: () => {
              const selection = editor.getSelection()
              const target = selection?.blocks?.[0]
              if (target) {
                editor.replaceBlocks([target as any], [{ type: 'chart' as any }])
                return
              }
              // Fallback: use the block at the cursor position (covers empty blocks)
              const cursor = (editor.getTextCursorPosition?.() as any) || null
              const cursorBlock = cursor?.block
              if (cursorBlock) {
                editor.replaceBlocks([cursorBlock as any], [{ type: 'chart' as any }])
                return
              }
              // Last fallback: append after last block
              const last = editor.document[editor.document.length - 1]
              const ref = last ?? editor.document[0]
              if (ref) {
                editor.insertBlocks([{ type: 'chart' as any }], ref, 'after')
              }
            },
          }
          // Simple filter matching title/aliases like defaults
          const all = [custom, ...getDefaultReactSlashMenuItems(editor)]
          const q = query.trim().toLowerCase()
          return q ? all.filter(i => (i.title?.toLowerCase().includes(q) || (i as any).aliases?.some((a: string) => a.includes(q)))) : all
        }}
      />
    </BlockNoteView>
  )
}