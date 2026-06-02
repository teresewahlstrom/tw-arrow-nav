import {
	App,
	TFile,
	WorkspaceLeaf,
} from 'obsidian';

import {
	FOLDER_SUMMARY_VIEW_TYPE,
} from './folder-summary-view';

type PreviewTarget =
	| {
			kind: 'file';
			file: TFile;
			activateEditor: boolean;
	  }
	| {
			kind: 'folder';
			folderPath: string;
	  };

export class PreviewController {
	private previewLeaf: WorkspaceLeaf | null = null;
	private previewRequestId = 0;
	private previewTask: Promise<void> = Promise.resolve();
	private cleanupLeafListeners: (() => void) | null = null;
	public onPreviewCommitted: (() => void) | null = null;

	constructor(private app: App) {}

	async showFile(
		file: TFile,
		activateEditor = false
	): Promise<void> {
		if (activateEditor) {
			if (this.previewLeaf) {
				this.convertPreviewToPermanent();
			}
			const activeLeaf = this.app.workspace.getLeaf(false);
			await activeLeaf.openFile(file, { active: true, eState: { focus: true } });
			this.app.workspace.setActiveLeaf(activeLeaf, { focus: true });
			return;
		}

		await this.enqueuePreviewTarget({
			kind: 'file',
			file,
			activateEditor: false,
		});
	}

	async showFolder(
		folderPath: string
	): Promise<void> {
		await this.enqueuePreviewTarget({
			kind: 'folder',
			folderPath,
		});
	}

	getPreviewContainerEl(): HTMLElement | null {
		return (this.previewLeaf as any)?.containerEl || null;
	}

	dispose(): void {
		this.previewRequestId += 1;
		this.closePreviewLeaf();
		this.app.workspace.detachLeavesOfType(
			FOLDER_SUMMARY_VIEW_TYPE
		);
	}

	private isWorkspaceLeafStillPresent(
		targetLeaf: WorkspaceLeaf
	): boolean {
		let found = false;

		this.app.workspace.iterateAllLeaves(
			(leaf) => {
				if (leaf === targetLeaf) {
					found = true;
				}
			}
		);

		return found;
	}

	private getOrCreatePreviewLeaf(): WorkspaceLeaf {
		if (
			this.previewLeaf &&
			this.isWorkspaceLeafStillPresent(
				this.previewLeaf
			)
		) {
			return this.previewLeaf;
		}

		const activeEl = document.activeElement as HTMLElement | null;

		const leaf = this.app.workspace.getLeaf('tab');
		this.previewLeaf = leaf;
		this.setupPreviewLeaf(leaf);

		if (activeEl && typeof activeEl.focus === 'function') {
			activeEl.focus();
		}

		return this.previewLeaf;
	}

	private setupPreviewLeaf(leaf: WorkspaceLeaf) {
		(leaf as any).containerEl.classList.add('tw-arrow-nav-preview-leaf');
		
		const tabHeader = (leaf as any).tabHeaderEl as HTMLElement | undefined;
		if (tabHeader) {
			tabHeader.classList.add('tw-arrow-nav-preview-tab');
		}

		(leaf as any).isTWPreviewLeaf = true;

		const onInteract = () => {
			this.convertPreviewToPermanent();
		};

		(leaf as any).containerEl.addEventListener('click', onInteract);
		(leaf as any).containerEl.addEventListener('focusin', onInteract);

		this.cleanupLeafListeners = () => {
			(leaf as any).containerEl.removeEventListener('click', onInteract);
			(leaf as any).containerEl.removeEventListener('focusin', onInteract);
		};
	}

	public convertPreviewToPermanent() {
		if (!this.previewLeaf) return;

		(this.previewLeaf as any).containerEl.classList.remove('tw-arrow-nav-preview-leaf');
		
		const tabHeader = (this.previewLeaf as any).tabHeaderEl as HTMLElement | undefined;
		if (tabHeader) {
			tabHeader.classList.remove('tw-arrow-nav-preview-tab');
		}

		delete (this.previewLeaf as any).isTWPreviewLeaf;

		if (this.cleanupLeafListeners) {
			this.cleanupLeafListeners();
			this.cleanupLeafListeners = null;
		}

		this.previewLeaf = null;

		if (this.onPreviewCommitted) {
			this.onPreviewCommitted();
		}
	}

	public closePreviewLeaf() {
		if (this.previewLeaf) {
			if (this.cleanupLeafListeners) {
				this.cleanupLeafListeners();
				this.cleanupLeafListeners = null;
			}
			this.previewLeaf.detach();
			this.previewLeaf = null;
		}
	}

	private enqueuePreviewTarget(
		target: PreviewTarget
	): Promise<void> {
		const requestId =
			++this.previewRequestId;

		const task =
			this.previewTask.then(async () => {
				if (
					requestId !==
					this.previewRequestId
				) {
					return;
				}

				const leaf =
					this.getOrCreatePreviewLeaf();

				if (target.kind === 'folder') {
					await leaf.setViewState({
						type:
							FOLDER_SUMMARY_VIEW_TYPE,
						active: false,
						state: {
							folderPath:
								target.folderPath,
						},
					});

					return;
				}

				await leaf.openFile(
					target.file,
					{
						active: false,
						eState: {
							focus: false,
						},
					}
				);
			});

		this.previewTask =
			task.catch((error) => {
				console.error(
					'[tw-arrow-nav] Preview update failed',
					error
				);
			});

		return this.previewTask;
	}
}
