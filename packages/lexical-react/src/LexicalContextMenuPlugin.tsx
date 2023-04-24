/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {MenuRenderFn, MenuResolution} from './shared/LexicalMenu';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {TextNode} from 'lexical';
import {
  MutableRefObject,
  ReactPortal,
  useCallback,
  useEffect,
  useState,
} from 'react';
import * as React from 'react';

import {LexicalMenu, MenuOption, useMenuAnchorRef} from './shared/LexicalMenu';

export type ContextMenuRenderFn<TOption extends MenuOption> = (
  anchorElementRef: MutableRefObject<HTMLElement | null>,
  itemProps: {
    selectedIndex: number | null;
    selectOptionAndCleanUp: (option: TOption) => void;
    setHighlightedIndex: (index: number) => void;
    options: Array<TOption>;
  },
  menuProps: {
    setMenuRef: (element: HTMLElement | null) => void;
  },
) => ReactPortal | JSX.Element | null;

export type NodeMenuPluginProps<TOption extends MenuOption> = {
  onSelectOption: (
    option: TOption,
    textNodeContainingQuery: TextNode | null,
    closeMenu: () => void,
    matchingString: string,
  ) => void;
  options: Array<TOption>;
  onClose?: () => void;
  onOpen?: (resolution: MenuResolution) => void;
  menuRenderFn: ContextMenuRenderFn<TOption>;
  anchorClassName?: string;
};

export function LexicalContextMenuPlugin<TOption extends MenuOption>({
  options,
  onClose,
  onOpen,
  onSelectOption,
  menuRenderFn: contextMenuRenderFn,
  anchorClassName,
}: NodeMenuPluginProps<TOption>): JSX.Element | null {
  const [editor] = useLexicalComposerContext();
  const [resolution, setResolution] = useState<MenuResolution | null>(null);
  const menuRef = React.useRef<HTMLElement | null>(null);

  const anchorElementRef = useMenuAnchorRef(
    resolution,
    setResolution,
    anchorClassName,
  );

  const closeNodeMenu = useCallback(() => {
    setResolution(null);
    if (onClose != null && resolution !== null) {
      onClose();
    }
  }, [onClose, resolution]);

  const openNodeMenu = useCallback(
    (res: MenuResolution) => {
      setResolution(res);
      if (onOpen != null && resolution === null) {
        onOpen(res);
      }
    },
    [onOpen, resolution],
  );

  const handleContextMenu = useCallback(
    (event: MouseEvent) => {
      event.preventDefault();
      openNodeMenu({
        getRect: () => new DOMRect(event.clientX, event.clientY, 1, 1),
      });
    },
    [openNodeMenu],
  );

  const handleClick = useCallback(
    (event: MouseEvent) => {
      if (
        resolution !== null &&
        menuRef.current != null &&
        event.target != null &&
        !menuRef.current.contains(event.target as Node)
      ) {
        closeNodeMenu();
      }

      if (
        menuRef.current != null &&
        menuRef.current.contains(event.target as Node)
      ) {
        console.log('inside menu');
        event.preventDefault();
        event.stopImmediatePropagation();
        event.stopPropagation();
      }
    },
    [closeNodeMenu, resolution],
  );

  const handleMenuClick = useCallback((event: MouseEvent) => {
    // console.log('menu click');
    // event.preventDefault();
    // event.stopImmediatePropagation();
    // event.stopPropagation();
  }, []);

  useEffect(() => {
    const editorElement = editor.getRootElement();
    if (editorElement) {
      editorElement.addEventListener('contextmenu', handleContextMenu);
      return () =>
        editorElement.removeEventListener('contextmenu', handleContextMenu);
    }
  }, [editor, handleContextMenu]);

  useEffect(() => {
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [editor, handleClick]);

  useEffect(() => {
    const menuElement = menuRef.current;
    console.log({menuElement});
    if (menuElement) {
      menuElement.addEventListener('click', handleMenuClick);
      return () => menuElement.removeEventListener('click', handleMenuClick);
    }
  }, [editor, handleMenuClick, resolution]);

  return resolution === null || editor === null ? null : (
    <LexicalMenu
      close={closeNodeMenu}
      resolution={resolution}
      editor={editor}
      anchorElementRef={anchorElementRef}
      options={options}
      menuRenderFn={(anchorRef, itemProps) =>
        contextMenuRenderFn(anchorRef, itemProps, {
          setMenuRef: (ref) => {
            menuRef.current = ref;
          },
        })
      }
      onSelectOption={onSelectOption}
    />
  );
}

export {MenuOption, MenuRenderFn, MenuResolution};

export async function getTypeFromObject(
  clipboardData: DataTransfer | ClipboardItem,
  type: string,
): Promise<string> {
  try {
    return clipboardData instanceof DataTransfer
      ? clipboardData.getData(type)
      : clipboardData instanceof ClipboardItem
      ? await clipboardData.getType(type)
      : '';
  } catch {
    return '';
  }
}