import { FileView, Plugin, TFile, WorkspaceLeaf } from 'obsidian';

export default class FileNavPlugin extends Plugin {
	private previewLeaf: WorkspaceLeaf | null = null;
	private pendingPreview: { file: TFile } | null = null;
	private previewWorkerRunning = false;
	private currentNavItem: HTMLElement | null = null;
	private clickListener = (evt: MouseEvent) => {
		const target = (evt.target as HTMLElement | null)?.closest('.nav-file-title, .nav-folder-title') as HTMLElement | null;
		if (target) {
			this.currentNavItem = target;
		}
	}

	private resetExplorerCursor = () => {
		this.currentNavItem = null;
		for (const item of this.getExplorerItems()) {
			item.classList.remove('is-active');
		}
	}

	private getExplorerItems() {
		return Array.from(document.querySelectorAll('.nav-file-title, .nav-folder-title')) as HTMLElement[];
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

		if (!this.currentNavItem || !this.currentNavItem.isConnected) {
			const obsidianActive = items.find(el => el.classList.contains('is-active'));
			if (obsidianActive) {
				this.currentNavItem = obsidianActive;
			}
		}

		let currentIndex = this.currentNavItem ? items.indexOf(this.currentNavItem) : -1;
		if (currentIndex === -1) {
			currentIndex = items.findIndex(el => el.offsetParent !== null);
			if (currentIndex === -1) currentIndex = 0;
		}

		let nextIndex = currentIndex + (evt.key === 'ArrowDown' ? 1 : -1);
		if (nextIndex < 0) nextIndex = 0;
		if (nextIndex >= items.length) nextIndex = items.length - 1;

		const target = items[nextIndex];
		if (target) {
			evt.preventDefault();
			evt.stopPropagation();

			this.updateExplorerSelection(target);
			this.currentNavItem = target;
			try { target.scrollIntoView({ block: 'nearest' }); } catch (e) { }

			const file = this.getFileFromExplorerItem(target);
			if (!file) return;

			this.queuePreviewFile(file);
		}
	}

	enterListener = (evt: KeyboardEvent) => {
		if (evt.key !== 'Enter') return;

		const activeItem = this.currentNavItem || (document.activeElement as HTMLElement | null);
		if (!activeItem || (!activeItem.matches('.nav-file-title') && !activeItem.matches('.nav-folder-title'))) return;

		const file = this.getFileFromExplorerItem(activeItem);
		if (!file) return;

		evt.preventDefault();
		evt.stopPropagation();
		this.openFileFocused(file);
	}

	private getFileFromExplorerItem(item: HTMLElement): TFile | null {
		const path = item.getAttribute('data-path') || item.closest<HTMLElement>('[data-path]')?.getAttribute('data-path');
		if (!path) return null;

		const abstractFile = this.app.vault.getAbstractFileByPath(path);
		return abstractFile instanceof TFile ? abstractFile : null;
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
	}

	private updateExplorerSelection(target: HTMLElement) {
		const items = this.getExplorerItems();
		for (const item of items) {
			if (item === target) {
				item.classList.add('is-active');
			} else {
				item.classList.remove('is-active');
			}
		}
	}

	onload() {
		this.registerDomEvent(document, 'keydown', this.keyListener);
		this.registerDomEvent(document, 'keydown', this.enterListener);
		this.registerDomEvent(document, 'click', this.clickListener, true);
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
