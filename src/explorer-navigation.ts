import { App, Plugin, TFile } from 'obsidian';
import { PreviewController } from './preview-controller';

type FolderTarget = {
	folderPath: string;
	folderTreeItem: HTMLElement;
};

export class ExplorerNavigation {
	private navAnchorPath: string | null = null;
	private explorerRoot: HTMLElement | null = null;
	private navigationSessionActive = false;
	private isProgrammaticFolderToggle = false;
	private cursorStyleElement: HTMLStyleElement | null = null;

	constructor(
		private app: App,
		private preview: PreviewController
	) {}

	register(plugin: Plugin): void {
		this.installCursorStyles();

		plugin.registerDomEvent(window, 'keydown', this.handleLeftArrow, true);
		plugin.registerDomEvent(window, 'keydown', this.handleRightArrow, true);
		plugin.registerDomEvent(window, 'keydown', this.handleArrowNavigation, true);
		plugin.registerDomEvent(window, 'keydown', this.handleEnter, true);

		plugin.registerDomEvent(document, 'pointerdown', this.documentPointerDownListener, true);
		plugin.registerDomEvent(document, 'click', this.explorerClickListener);
		plugin.registerDomEvent(document, 'focusin', this.documentFocusInListener, true);
		plugin.registerDomEvent(window, 'blur', this.resetExplorerCursor);
		plugin.registerDomEvent(document, 'visibilitychange', () => {
			if (document.hidden) {
				this.resetExplorerCursor();
			}
		});
	}

	dispose(): void {
		this.resetExplorerCursor();
		this.removeCursorStyles();
	}

	private installCursorStyles() {
		if (this.cursorStyleElement) return;

		const existing = document.querySelector('style[data-tw-arrow-nav-cursor="true"]');
		if (existing instanceof HTMLStyleElement) {
			this.cursorStyleElement = existing;
			return;
		}

		const style = document.createElement('style');
		style.setAttribute('data-tw-arrow-nav-cursor', 'true');
		style.textContent = '.tree-item-self.tw-arrow-nav-cursor { outline: 2px solid var(--interactive-accent); outline-offset: -2px; border-radius: var(--radius-s); }';

		(document.head || document.body).appendChild(style);
		this.cursorStyleElement = style;
	}

	private removeCursorStyles() {
		this.cursorStyleElement?.remove();
		this.cursorStyleElement = null;
	}

	private setNavAnchor(path: string | null) {
		this.navAnchorPath = path;
		this.renderCursor();
	}

	private getExplorerRootFromElement(el: HTMLElement | null): HTMLElement | null {
		if (!el) return null;

		const leafRoot = el.closest('.workspace-leaf-content[data-type="file-explorer"]') as HTMLElement | null;
		if (leafRoot) return leafRoot;

		return el.closest('.nav-files-container') as HTMLElement | null;
	}

	private beginNavigationSessionForItem(item: HTMLElement) {
		const root = this.getExplorerRootFromElement(item);
		if (!root) return;

		const rootChanged = this.explorerRoot !== null && this.explorerRoot !== root;
		if (rootChanged) {
			this.clearCursorInRoot(this.explorerRoot);
			this.navAnchorPath = null;
		}

		this.explorerRoot = root;
		this.navigationSessionActive = true;
	}

	private resetExplorerCursor = () => {
		this.clearCursorInRoot(this.explorerRoot);
		this.navAnchorPath = null;
		this.explorerRoot = null;
		this.navigationSessionActive = false;
	};

	private getAllExplorerItems() {
		if (!this.explorerRoot) return [];

		return Array.from(this.explorerRoot.querySelectorAll('.nav-file-title, .nav-folder-title')) as HTMLElement[];
	}

	private getVisibleExplorerItems() {
		return this.getAllExplorerItems().filter((item) => item.offsetParent !== null);
	}

	private clearCursorInRoot(root: HTMLElement | null) {
		if (!root) return;

		for (const row of Array.from(root.querySelectorAll('.tree-item-self.tw-arrow-nav-cursor')) as HTMLElement[]) {
			row.classList.remove('tw-arrow-nav-cursor');
		}
	}

	private getExplorerRow(item: HTMLElement) {
		return (item.closest('.tree-item-self') as HTMLElement | null) || item;
	}

	private getPathFromExplorerItem(item: HTMLElement): string | null {
		return item.getAttribute('data-path') || item.closest<HTMLElement>('[data-path]')?.getAttribute('data-path') || null;
	}

	private getExplorerItemFromEventTarget(el: HTMLElement | null): HTMLElement | null {
		if (!el) return null;

		const titleItem = el.closest('.nav-file-title, .nav-folder-title') as HTMLElement | null;
		if (titleItem) return titleItem;

		const row = el.closest('.tree-item-self') as HTMLElement | null;
		if (!row) return null;

		if (row.matches('.nav-file-title, .nav-folder-title')) {
			return row;
		}

		return row.querySelector(':scope > .nav-file-title, :scope > .nav-folder-title') as HTMLElement | null;
	}

	private resolveVisibleNavItemByExactPath(path: string | null): HTMLElement | null {
		if (!path) return null;

		return this.getVisibleExplorerItems().find((item) => this.getPathFromExplorerItem(item) === path) || null;
	}

	private resolveNearestVisibleNavItem(path: string | null): HTMLElement | null {
		if (!path) return null;

		let candidate = path;
		while (candidate) {
			const exact = this.resolveVisibleNavItemByExactPath(candidate);
			if (exact) return exact;

			const slash = candidate.lastIndexOf('/');
			if (slash < 0) return null;

			candidate = candidate.slice(0, slash);
		}

		return null;
	}

	private renderCursor() {
		this.clearCursorInRoot(this.explorerRoot);

		if (!this.navigationSessionActive || !this.explorerRoot || !this.navAnchorPath) {
			return;
		}

		const target = this.resolveVisibleNavItemByExactPath(this.navAnchorPath) || this.resolveNearestVisibleNavItem(this.navAnchorPath);
		if (!target) return;

		const targetPath = this.getPathFromExplorerItem(target);
		if (targetPath && targetPath !== this.navAnchorPath) {
			this.navAnchorPath = targetPath;
		}

		this.getExplorerRow(target).classList.add('tw-arrow-nav-cursor');
	}

	private getCurrentNavItem(items: HTMLElement[]): HTMLElement | null {
		if (!this.navAnchorPath) return null;

		const exact = this.resolveVisibleNavItemByExactPath(this.navAnchorPath);
		if (exact && items.includes(exact)) {
			return exact;
		}

		const visibleAncestor = this.resolveNearestVisibleNavItem(this.navAnchorPath);
		if (!visibleAncestor || !items.includes(visibleAncestor)) {
			return null;
		}

		const ancestorPath = this.getPathFromExplorerItem(visibleAncestor);
		if (!ancestorPath) return null;

		this.navAnchorPath = ancestorPath;
		this.renderCursor();
		return visibleAncestor;
	}

	private getFolderTargetForLeftArrow(item: HTMLElement): FolderTarget | null {
		const itemPath = this.getPathFromExplorerItem(item);
		if (!itemPath) return null;

		if (item.matches('.nav-folder-title')) {
			const folderTreeItem = item.closest('.tree-item') as HTMLElement | null;
			if (!folderTreeItem) return null;

			return {
				folderPath: itemPath,
				folderTreeItem,
			};
		}

		if (!item.matches('.nav-file-title')) {
			return null;
		}

		const fileTreeItem = item.closest('.tree-item') as HTMLElement | null;
		if (!fileTreeItem) return null;

		const containingFolderTreeItem = fileTreeItem.parentElement?.closest('.tree-item') as HTMLElement | null;
		if (!containingFolderTreeItem) return null;

		const folderRow = containingFolderTreeItem.querySelector(':scope > .tree-item-self') as HTMLElement | null;
		if (!folderRow || !folderRow.matches('.nav-folder-title')) {
			return null;
		}

		const folderPath = this.getPathFromExplorerItem(folderRow);
		if (!folderPath) return null;

		return {
			folderPath,
			folderTreeItem: containingFolderTreeItem,
		};
	}

	private isTreeItemExpanded(treeItem: HTMLElement) {
		const row = treeItem.querySelector(':scope > .tree-item-self') as HTMLElement | null;
		const expanded = row?.getAttribute('aria-expanded');

		if (expanded === 'true') return true;
		if (expanded === 'false') return false;

		return !treeItem.classList.contains('is-collapsed');
	}

	private setFolderExpanded(treeItem: HTMLElement, expectedFolderPath: string, expanded: boolean) {
		const row = treeItem.querySelector(':scope > .tree-item-self') as HTMLElement | null;
		if (!row) return false;

		const folderTitle = row.matches('.nav-folder-title')
			? row
			: (row.querySelector(':scope > .nav-folder-title') as HTMLElement | null);
		if (!folderTitle) return false;

		const actualFolderPath = this.getPathFromExplorerItem(folderTitle);
		if (actualFolderPath !== expectedFolderPath) {
			console.warn('[tw-arrow-nav] folder-action:path-mismatch', {
				expectedFolderPath,
				actualFolderPath,
			});
			return false;
		}

		if (this.isTreeItemExpanded(treeItem) === expanded) {
			return false;
		}

		const collapseIcon = row.querySelector(':scope > .collapse-icon') as HTMLElement | null;
		if (!collapseIcon) return false;

		this.isProgrammaticFolderToggle = true;
		try {
			collapseIcon.click();
		} finally {
			this.isProgrammaticFolderToggle = false;
		}

		return true;
	}

	private showFilePreview(file: TFile, activateEditor = false) {
		void this.preview.showFile(file, activateEditor);
	}

	private showFolderPreview(folderPath: string) {
		void this.preview.showFolder(folderPath);
	}

	private consumeKey(evt: KeyboardEvent) {
		evt.preventDefault();
		evt.stopImmediatePropagation();
	}

	private shouldIgnoreNavigationKey(evt: KeyboardEvent): boolean {
		const target = evt.target as HTMLElement | null;
		const activeEl = (document.activeElement as HTMLElement | null) || target;
		if (!activeEl) return false;

		const tag = activeEl.tagName;
		if (tag === 'INPUT' || tag === 'TEXTAREA') return true;
		if (activeEl.isContentEditable) return true;
		if (activeEl.closest('.modal')) return true;

		return false;
	}

	private handleLeftArrow = (evt: KeyboardEvent) => {
		if (evt.key !== 'ArrowLeft') return;
		if (!this.navigationSessionActive || !this.explorerRoot || !this.navAnchorPath) return;
		if (!this.explorerRoot.isConnected) {
			this.resetExplorerCursor();
			return;
		}
		if (this.shouldIgnoreNavigationKey(evt)) return;

		this.consumeKey(evt);

		const items = this.getVisibleExplorerItems();
		if (!items.length) return;

		const currentItem = this.getCurrentNavItem(items);
		if (!currentItem) return;

		const target = this.getFolderTargetForLeftArrow(currentItem);
		if (!target) return;

		if (!this.isTreeItemExpanded(target.folderTreeItem)) {
			return;
		}

		this.setNavAnchor(target.folderPath);

		const collapsed = this.setFolderExpanded(target.folderTreeItem, target.folderPath, false);
		if (!collapsed) return;

		this.setNavAnchor(target.folderPath);
		this.showFolderPreview(target.folderPath);
	};

	private handleRightArrow = (evt: KeyboardEvent) => {
		if (evt.key !== 'ArrowRight') return;
		if (!this.navigationSessionActive || !this.explorerRoot || !this.navAnchorPath) return;
		if (!this.explorerRoot.isConnected) {
			this.resetExplorerCursor();
			return;
		}
		if (this.shouldIgnoreNavigationKey(evt)) return;

		this.consumeKey(evt);

		const items = this.getVisibleExplorerItems();
		if (!items.length) return;

		const currentItem = this.getCurrentNavItem(items);
		if (!currentItem || !currentItem.matches('.nav-folder-title')) {
			return;
		}

		const folderPath = this.getPathFromExplorerItem(currentItem);
		if (!folderPath) return;

		const folderTreeItem = currentItem.closest('.tree-item') as HTMLElement | null;
		if (!folderTreeItem) return;

		if (this.isTreeItemExpanded(folderTreeItem)) {
			return;
		}

		this.setNavAnchor(folderPath);

		const expanded = this.setFolderExpanded(folderTreeItem, folderPath, true);
		if (!expanded) return;

		this.setNavAnchor(folderPath);
		this.showFolderPreview(folderPath);
	};

	private handleArrowNavigation = (evt: KeyboardEvent) => {
		if (evt.key !== 'ArrowUp' && evt.key !== 'ArrowDown') return;
		if (!this.navigationSessionActive || !this.explorerRoot || !this.navAnchorPath) return;
		if (!this.explorerRoot.isConnected) {
			this.resetExplorerCursor();
			return;
		}
		if (this.shouldIgnoreNavigationKey(evt)) return;

		this.consumeKey(evt);

		const items = this.getVisibleExplorerItems();
		if (!items.length) return;

		const currentItem = this.getCurrentNavItem(items);
		if (!currentItem) return;

		const currentIndex = items.indexOf(currentItem);
		if (currentIndex < 0) return;

		let nextIndex = currentIndex + (evt.key === 'ArrowDown' ? 1 : -1);
		nextIndex = Math.max(0, Math.min(items.length - 1, nextIndex));

		const target = items[nextIndex];
		if (!target) return;

		const targetPath = this.getPathFromExplorerItem(target);
		if (!targetPath) return;

		this.setNavAnchor(targetPath);

		try {
			target.scrollIntoView({ block: 'nearest' });
		} catch {
			// Ignore transient explorer DOM timing.
		}

		const file = this.getFileFromExplorerItem(target);
		if (file) {
			this.showFilePreview(file, false);
			return;
		}

		if (target.matches('.nav-folder-title')) {
			this.showFolderPreview(targetPath);
		}
	};

	private handleEnter = (evt: KeyboardEvent) => {
		if (evt.key !== 'Enter') return;
		if (!this.navigationSessionActive || !this.explorerRoot || !this.navAnchorPath) return;
		if (!this.explorerRoot.isConnected) {
			this.resetExplorerCursor();
			return;
		}

		const activeItem = this.resolveVisibleNavItemByExactPath(this.navAnchorPath) || this.resolveNearestVisibleNavItem(this.navAnchorPath);
		if (!activeItem) return;

		const file = this.getFileFromExplorerItem(activeItem);
		if (!file) return;

		this.consumeKey(evt);
		this.navigationSessionActive = false;
		this.renderCursor();

		void this.preview.showFile(file, true);
	};

	private documentPointerDownListener = (evt: PointerEvent) => {
		const target = evt.target as HTMLElement | null;
		if (!target) return;

		const explorerRoot = this.getExplorerRootFromElement(target);
		if (!explorerRoot) {
			this.resetExplorerCursor();
			return;
		}

		const explorerItem = this.getExplorerItemFromEventTarget(target);
		if (!explorerItem || !explorerRoot.contains(explorerItem)) {
			this.resetExplorerCursor();
			return;
		}

		this.beginNavigationSessionForItem(explorerItem);
		if (!this.navigationSessionActive) return;

		const path = this.getPathFromExplorerItem(explorerItem);
		if (!path) return;

		this.setNavAnchor(path);
	};

	private explorerClickListener = (evt: MouseEvent) => {
		if (this.isProgrammaticFolderToggle) return;

		const target = evt.target as HTMLElement | null;
		if (!target) return;

		const explorerRoot = this.getExplorerRootFromElement(target);
		if (!explorerRoot) return;

		const explorerItem = this.getExplorerItemFromEventTarget(target);
		if (!explorerItem || !explorerRoot.contains(explorerItem)) {
			return;
		}

		this.beginNavigationSessionForItem(explorerItem);
		if (!this.navigationSessionActive) return;

		const path = this.getPathFromExplorerItem(explorerItem);
		if (!path) return;

		this.setNavAnchor(path);

		if (evt.target instanceof HTMLElement && evt.target.closest('.collapse-icon')) {
			return;
		}

		if (explorerItem.matches('.nav-folder-title')) {
			this.showFolderPreview(path);
		}
	};

	private documentFocusInListener = (evt: FocusEvent) => {
		const target = evt.target as HTMLElement | null;
		if (!target) return;

		if (this.explorerRoot && this.explorerRoot.contains(target)) {
			return;
		}

		if (target === document.body) {
			return;
		}

		this.resetExplorerCursor();
	};

	private getFileFromExplorerItem(item: HTMLElement): TFile | null {
		const path = this.getPathFromExplorerItem(item);
		if (!path) return null;

		const abstractFile = this.app.vault.getAbstractFileByPath(path);
		return abstractFile instanceof TFile ? abstractFile : null;
	}
}
