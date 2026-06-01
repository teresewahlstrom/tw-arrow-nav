import { FileView, Plugin, TFile, WorkspaceLeaf } from 'obsidian';

export default class FileNavPlugin extends Plugin {
	private previewLeaf: WorkspaceLeaf | null = null;
	private pendingPreview: { file: TFile } | null = null;
	private previewWorkerRunning = false;
	private currentNavPath: string | null = null;
	private clickListener = (evt: MouseEvent) => {
		const target = (evt.target as HTMLElement | null)?.closest(
			'.nav-file-title, .nav-folder-title'
		) as HTMLElement | null;
		if (!target) return;

		const path = this.getPathFromExplorerItem(target);
		this.currentNavPath = path;
		this.applyExplorerFocusLater(path);
	}

	private applyExplorerFocusLater(path: string | null) {
		const delays = [0, 16, 48, 96];
		for (const delay of delays) {
			window.setTimeout(() => {
				if (path !== this.currentNavPath) return;

				const target = this.resolveVisibleNavItemFromPath(path);
				if (!target) return;

				this.applyExplorerFocusState(target);
			}, delay);
		}
	}

	private resetExplorerCursor = () => {
		this.currentNavPath = null;
		for (const row of this.getAllExplorerRows()) {
			row.classList.remove('is-focused', 'mod-focused', 'has-focus', 'is-active', 'is-selected');
		}
	}

	private getAllExplorerRows() {
		return Array.from(document.querySelectorAll('.tree-item-self')) as HTMLElement[];
	}

	private getExplorerRow(item: HTMLElement) {
		return (item.closest('.tree-item-self') as HTMLElement | null) || item;
	}

	private getAllExplorerItems() {
		return Array.from(document.querySelectorAll('.nav-file-title, .nav-folder-title')) as HTMLElement[];
	}

	private getExplorerItems() {
		return this.getAllExplorerItems().filter(item => item.offsetParent !== null);
	}

	private focusExplorerRow(item: HTMLElement) {
		const row = this.getExplorerRow(item);
		try {
			row.setAttribute('tabindex', '-1');
			row.focus({ preventScroll: true });
		} catch (e) { }
	}

	private isExplorerItem(el: HTMLElement | null) {
		return !!el && (el.matches('.nav-file-title') || el.matches('.nav-folder-title'));
	}

	private getFocusedExplorerItem() {
		const activeEl = document.activeElement as HTMLElement | null;
		if (!activeEl) return null;

		if (this.isExplorerItem(activeEl) && activeEl.offsetParent !== null) {
			return activeEl;
		}

		if (activeEl.matches('.tree-item-self')) {
			const item = activeEl.querySelector('.nav-file-title, .nav-folder-title') as HTMLElement | null;
			if (item && item.offsetParent !== null) {
				return item;
			}
		}

		return null;
	}

	private resolveVisibleNavItemFromPath(path: string | null) {
		if (!path) return null;

		const visibleItems = this.getExplorerItems();
		if (!visibleItems.length) return null;

		let candidate = path;
		while (candidate) {
			const match = visibleItems.find(item => this.getPathFromExplorerItem(item) === candidate) || null;
			if (match) return match;

			const slash = candidate.lastIndexOf('/');
			if (slash < 0) return null;
			candidate = candidate.slice(0, slash);
		}

		return null;
	}

	private getCurrentNavItem(items: HTMLElement[]) {
		const focusedItem = this.getFocusedExplorerItem();
		if (focusedItem) {
			return focusedItem;
		}

		const fromPath = this.resolveVisibleNavItemFromPath(this.currentNavPath);
		if (fromPath) return fromPath;

		return null;
	}

	private applyExplorerFocusState(target: HTMLElement) {
		const focusRow = this.getExplorerRow(target);
		for (const row of this.getAllExplorerRows()) {
			row.classList.remove('is-active', 'is-selected');
			if (row === focusRow) {
				row.classList.add('is-focused', 'mod-focused', 'has-focus');
			} else {
				row.classList.remove('is-focused', 'mod-focused', 'has-focus');
			}
		}

		this.focusExplorerRow(target);
	}

	keyListener = (evt: KeyboardEvent) => {
		if (evt.key !== 'ArrowUp' && evt.key !== 'ArrowDown') return;

		// Ignore when typing in inputs or editors
		const activeEl = document.activeElement as HTMLElement | null;
		if (!activeEl) return;
		const tag = activeEl.tagName;
		if (tag === 'TEXTAREA' || tag === 'INPUT' || (activeEl && activeEl.isContentEditable)) return;

		// Avoid interfering with modal prompts etc.
		if (activeEl.closest && activeEl.closest('.modal')) return;

		const items = this.getExplorerItems();
		if (!items.length) return;
		const currentItem = this.getCurrentNavItem(items);
		if (!currentItem) return;
		this.currentNavPath = this.getPathFromExplorerItem(currentItem);

		let currentIndex = items.indexOf(currentItem);
		if (currentIndex === -1) {
			return;
		}

		let nextIndex = currentIndex + (evt.key === 'ArrowDown' ? 1 : -1);
		if (nextIndex < 0) nextIndex = 0;
		if (nextIndex >= items.length) nextIndex = items.length - 1;

		const target = items[nextIndex];
		if (target) {
			evt.preventDefault();
			evt.stopPropagation();

			this.applyExplorerFocusState(target);
			this.currentNavPath = this.getPathFromExplorerItem(target);
			try { target.scrollIntoView({ block: 'nearest' }); } catch (e) { }

			const file = this.getFileFromExplorerItem(target);
			if (!file) return;

			this.queuePreviewFile(file);
		}
	}

	enterListener = (evt: KeyboardEvent) => {
		if (evt.key !== 'Enter') return;

		const activeItem = this.resolveVisibleNavItemFromPath(this.currentNavPath) || (document.activeElement as HTMLElement | null);
		if (!activeItem || (!activeItem.matches('.nav-file-title') && !activeItem.matches('.nav-folder-title'))) return;

		const file = this.getFileFromExplorerItem(activeItem);
		if (!file) return;

		evt.preventDefault();
		evt.stopPropagation();
		this.openFileFocused(file);
	}

	private getFileFromExplorerItem(item: HTMLElement): TFile | null {
		const path = this.getPathFromExplorerItem(item);
		if (!path) return null;

		const abstractFile = this.app.vault.getAbstractFileByPath(path);
		return abstractFile instanceof TFile ? abstractFile : null;
	}

	private getPathFromExplorerItem(item: HTMLElement): string | null {
		return item.getAttribute('data-path') || item.closest<HTMLElement>('[data-path]')?.getAttribute('data-path') || null;
	}

	private getPreviewLeaf(): WorkspaceLeaf {
		if (this.previewLeaf?.view.containerEl.isConnected) {
			return this.previewLeaf;
		}
		this.previewLeaf = null;

		const activeFile = this.app.workspace.getActiveFile();
		if (activeFile) {
			this.app.workspace.iterateRootLeaves((leaf) => {
				if (
					!this.previewLeaf &&
					leaf.view instanceof FileView &&
					leaf.view.file === activeFile
				) {
					this.previewLeaf = leaf;
				}
			});
		}

		if (!this.previewLeaf) {
			this.app.workspace.iterateRootLeaves((leaf) => {
				if (!this.previewLeaf) {
					this.previewLeaf = leaf;
				}
			});
		}

		this.previewLeaf = this.previewLeaf || this.app.workspace.getLeaf(false);
		return this.previewLeaf;
	}

	private queuePreviewFile(file: TFile) {
		this.pendingPreview = { file };
		if (!this.previewWorkerRunning) {
			void this.runPreviewWorker();
		}
	}

	private async runPreviewWorker() {
		this.previewWorkerRunning = true;
		try {
			while (this.pendingPreview) {
				const { file } = this.pendingPreview;
				this.pendingPreview = null;

				const leaf = this.getPreviewLeaf();
				await leaf.openFile(file, { active: false, eState: { focus: false } });
			}
		} finally {
			this.previewWorkerRunning = false;
			if (this.pendingPreview) {
				void this.runPreviewWorker();
			}
		}
	}

	private async openFileFocused(file: TFile) {
		const leaf = this.getPreviewLeaf();
		await leaf.openFile(file, { active: true, eState: { focus: true } });
		this.app.workspace.setActiveLeaf(leaf, { focus: true });
		this.currentNavPath = file.path;
	}

	onload() {
		this.registerDomEvent(document, 'keydown', this.keyListener);
		this.registerDomEvent(document, 'keydown', this.enterListener);
		this.registerDomEvent(document, 'click', this.clickListener);
		this.registerDomEvent(document, 'dblclick', this.clickListener);
		this.registerDomEvent(window, 'blur', this.resetExplorerCursor);
		this.registerDomEvent(document, 'visibilitychange', () => {
			if (document.hidden) {
				this.resetExplorerCursor();
			}
		});
	}

	onunload() {
		document.removeEventListener('keydown', this.keyListener);
		document.removeEventListener('keydown', this.enterListener);
	}
}
