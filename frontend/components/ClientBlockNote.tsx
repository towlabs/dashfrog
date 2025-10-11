import "@blocknote/core/fonts/inter.css";
import { useCreateBlockNote, useEditorChange } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import "@blocknote/shadcn/style.css";
import { BlockNoteSchema, defaultBlockSpecs, type BlockNoteEditor } from '@blocknote/core'
import { SuggestionMenuController, getDefaultReactSlashMenuItems, type DefaultReactSuggestionItem, SideMenuController, SideMenu, DragHandleMenu, type DragHandleMenuProps, RemoveBlockItem, BlockColorsItem } from '@blocknote/react'
import { ChartSettingsItem } from '@/components/blocks/ChartSettingsItem'
import { NumberSettingsItem } from '@/components/blocks/NumberSettingsItem'
import { BarChartSettingsItem } from '@/components/blocks/BarChartSettingsItem'
import { WorkflowSettingsItem } from '@/components/blocks/WorkflowSettingsItem'
import { WorkflowStatusMapSettingsItem } from '@/components/blocks/WorkflowStatusMapSettingsItem'
import { useEffect, useRef } from 'react'
import { TrendingUp, Hash, BarChart3, Workflow, GitBranch } from 'lucide-react'
import { createChartBlock } from '@/components/blocks/chart-block'
import { createNumberBlock } from '@/components/blocks/number-block'
import { createBarChartBlock } from '@/components/blocks/bar-chart-block'
import { createWorkflowBlock } from '@/components/blocks/workflow-block'
import { createWorkflowStatusMapBlock } from '@/components/blocks/workflow-status-map-block'
import { TimeWindowProvider, type TimeWindow } from '@/components/time-window-context'
import { blockNoteStorage } from '@/lib/blocknote-storage'

interface ClientBlockNoteProps {
  timeWindow: TimeWindow
  blockNoteId: string
  readonly?: boolean
  onEditorReady?: (editor: BlockNoteEditor) => void
}

export default function ClientBlockNote({ timeWindow, blockNoteId, readonly = false, onEditorReady }: ClientBlockNoteProps) {
  const loadedContentRef = useRef(false)

  const editor = useCreateBlockNote({
    schema: BlockNoteSchema.create({
      blockSpecs: {
        ...defaultBlockSpecs,
        chart: createChartBlock(),
        number: createNumberBlock(),
        barChart: createBarChartBlock(),
        workflow: createWorkflowBlock(),
        workflowStatusMap: createWorkflowStatusMapBlock(),
      },
    }),
    // Don't set initialContent here - we'll load it after editor is ready
  });

  // Notify parent when editor is ready
  useEffect(() => {
    if (editor && onEditorReady) {
      onEditorReady(editor)
    }
  }, [editor, onEditorReady])

  // Load content from storage after editor is created or when notebookId changes
  useEffect(() => {
    if (!editor) return

    // Reset loaded flag when notebookId changes
    loadedContentRef.current = false

    // Use setTimeout to ensure editor is fully ready
    const timer = setTimeout(() => {
      const savedContent = blockNoteStorage.load(blockNoteId)
      if (savedContent && savedContent.length > 0) {
        console.log('Loading saved content for notebook:', blockNoteId, savedContent)
        // Replace all blocks with saved content
        editor.replaceBlocks(editor.document, savedContent)
      } else {
        console.log('No saved content, using empty document')
        // Clear to a single empty paragraph if no saved content
        editor.replaceBlocks(editor.document, [{ type: 'paragraph' }])
      }
      loadedContentRef.current = true
    }, 0)

    return () => {
      clearTimeout(timer)
    }
  }, [editor, blockNoteId])

  // Save to storage whenever editor content changes (but not during initial load)
  useEditorChange(() => {
    if (editor && loadedContentRef.current) {
      blockNoteStorage.save(blockNoteId, editor.document)
    }
  }, editor)

  return (
    <TimeWindowProvider timeWindow={timeWindow}>
      <BlockNoteView editor={editor} theme="light" slashMenu={false} sideMenu={readonly} editable={!readonly}>
      {/* Custom Side Menu with Drag Handle Menu item */}
      <SideMenuController
        sideMenu={(props) => (
          <SideMenu
            {...props}
            dragHandleMenu={(menuProps: DragHandleMenuProps) => {
              const blockType = (menuProps.block as any).type
              if (blockType === 'chart') {
                return (
                  <DragHandleMenu {...menuProps}>
                    <RemoveBlockItem {...menuProps}>Delete</RemoveBlockItem>
                    <BlockColorsItem {...menuProps}>Colors</BlockColorsItem>
                    <ChartSettingsItem {...menuProps} />
                  </DragHandleMenu>
                )
              } else if (blockType === 'number') {
                return (
                  <DragHandleMenu {...menuProps}>
                    <RemoveBlockItem {...menuProps}>Delete</RemoveBlockItem>
                    <BlockColorsItem {...menuProps}>Colors</BlockColorsItem>
                    <NumberSettingsItem {...menuProps} />
                  </DragHandleMenu>
                )
              } else if (blockType === 'barChart') {
                return (
                  <DragHandleMenu {...menuProps}>
                    <RemoveBlockItem {...menuProps}>Delete</RemoveBlockItem>
                    <BlockColorsItem {...menuProps}>Colors</BlockColorsItem>
                    <BarChartSettingsItem {...menuProps} />
                  </DragHandleMenu>
                )
              } else if (blockType === 'workflow') {
                return (
                  <DragHandleMenu {...menuProps}>
                    <RemoveBlockItem {...menuProps}>Delete</RemoveBlockItem>
                    <BlockColorsItem {...menuProps}>Colors</BlockColorsItem>
                    <WorkflowSettingsItem {...menuProps} />
                  </DragHandleMenu>
                )
              } else if (blockType === 'workflowStatusMap') {
                return (
                  <DragHandleMenu {...menuProps}>
                    <RemoveBlockItem {...menuProps}>Delete</RemoveBlockItem>
                    <BlockColorsItem {...menuProps}>Colors</BlockColorsItem>
                    <WorkflowStatusMapSettingsItem {...menuProps} />
                  </DragHandleMenu>
                )
              } else {
                return <DragHandleMenu {...menuProps} />
              }
            }}
          />
        )}
      />
      <SuggestionMenuController
        triggerCharacter="/"
        getItems={async (query: string) => {
          const chartItem: DefaultReactSuggestionItem = {
            title: 'Line Chart',
            subtext: 'Insert a line chart',
            group: 'Charts',
            icon: <TrendingUp className="h-4 w-4" />,
            onItemClick: () => {
              const selection = editor.getSelection()
              const target = selection?.blocks?.[0]
              if (target) {
                editor.replaceBlocks([target as any], [{ type: 'chart' as any, props: { open: true } }])
                return
              }
              // Fallback: use the block at the cursor position (covers empty blocks)
              const cursor = (editor.getTextCursorPosition?.() as any) || null
              const cursorBlock = cursor?.block
              if (cursorBlock) {
                editor.replaceBlocks([cursorBlock as any], [{ type: 'chart' as any, props: { open: true } }])
                return
              }
              // Last fallback: append after last block
              const last = editor.document[editor.document.length - 1]
              const ref = last ?? editor.document[0]
              if (ref) {
                editor.insertBlocks([{ type: 'chart' as any, props: { open: true } }], ref, 'after')
              }
            },
          }

          const numberItem: DefaultReactSuggestionItem = {
            title: 'Number',
            subtext: 'Insert a metric number display',
            group: 'Charts',
            icon: <Hash className="h-4 w-4" />,
            onItemClick: () => {
              const selection = editor.getSelection()
              const target = selection?.blocks?.[0]
              if (target) {
                editor.replaceBlocks([target as any], [{ type: 'number' as any, props: { open: true } }])
                return
              }
              const cursor = (editor.getTextCursorPosition?.() as any) || null
              const cursorBlock = cursor?.block
              if (cursorBlock) {
                editor.replaceBlocks([cursorBlock as any], [{ type: 'number' as any, props: { open: true } }])
                return
              }
              const last = editor.document[editor.document.length - 1]
              const ref = last ?? editor.document[0]
              if (ref) {
                editor.insertBlocks([{ type: 'number' as any, props: { open: true } }], ref, 'after')
              }
            },
          }

          const barChartItem: DefaultReactSuggestionItem = {
            title: 'Bar Chart',
            subtext: 'Insert a bar chart',
            group: 'Charts',
            icon: <BarChart3 className="h-4 w-4" />,
            onItemClick: () => {
              const selection = editor.getSelection()
              const target = selection?.blocks?.[0]
              if (target) {
                editor.replaceBlocks([target as any], [{ type: 'barChart' as any, props: { open: true } }])
                return
              }
              const cursor = (editor.getTextCursorPosition?.() as any) || null
              const cursorBlock = cursor?.block
              if (cursorBlock) {
                editor.replaceBlocks([cursorBlock as any], [{ type: 'barChart' as any, props: { open: true } }])
                return
              }
              const last = editor.document[editor.document.length - 1]
              const ref = last ?? editor.document[0]
              if (ref) {
                editor.insertBlocks([{ type: 'barChart' as any, props: { open: true } }], ref, 'after')
              }
            },
          }

          const workflowItem: DefaultReactSuggestionItem = {
            title: 'Workflow',
            subtext: 'Insert a workflow steps table',
            group: 'Workflows',
            icon: <Workflow className="h-4 w-4" />,
            onItemClick: () => {
              const selection = editor.getSelection()
              const target = selection?.blocks?.[0]
              if (target) {
                editor.replaceBlocks([target as any], [{ type: 'workflow' as any, props: { open: true } }])
                return
              }
              const cursor = (editor.getTextCursorPosition?.() as any) || null
              const cursorBlock = cursor?.block
              if (cursorBlock) {
                editor.replaceBlocks([cursorBlock as any], [{ type: 'workflow' as any, props: { open: true } }])
                return
              }
              const last = editor.document[editor.document.length - 1]
              const ref = last ?? editor.document[0]
              if (ref) {
                editor.insertBlocks([{ type: 'workflow' as any, props: { open: true } }], ref, 'after')
              }
            },
          }

          const workflowStatusMapItem: DefaultReactSuggestionItem = {
            title: 'Workflow Status Map',
            subtext: 'Insert a workflow status map',
            group: 'Workflows',
            icon: <GitBranch className="h-4 w-4" />,
            onItemClick: () => {
              const selection = editor.getSelection()
              const target = selection?.blocks?.[0]
              if (target) {
                editor.replaceBlocks([target as any], [{ type: 'workflowStatusMap' as any, props: { open: true } }])
                return
              }
              const cursor = (editor.getTextCursorPosition?.() as any) || null
              const cursorBlock = cursor?.block
              if (cursorBlock) {
                editor.replaceBlocks([cursorBlock as any], [{ type: 'workflowStatusMap' as any, props: { open: true } }])
                return
              }
              const last = editor.document[editor.document.length - 1]
              const ref = last ?? editor.document[0]
              if (ref) {
                editor.insertBlocks([{ type: 'workflowStatusMap' as any, props: { open: true } }], ref, 'after')
              }
            },
          }

          // Simple filter matching title/aliases like defaults
          const all = [chartItem, numberItem, barChartItem, workflowItem, workflowStatusMapItem, ...getDefaultReactSlashMenuItems(editor)]
          const q = query.trim().toLowerCase()
          return q ? all.filter(i => (i.title?.toLowerCase().includes(q) || (i as any).aliases?.some((a: string) => a.includes(q)))) : all
        }}
      />
    </BlockNoteView>
    </TimeWindowProvider>
  )
}