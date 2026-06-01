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

	constructor(private app: App) {}

	async showFile(
		file: TFile,
		activateEditor = false
	): Promise<void> {
		await this.enqueuePreviewTarget({
			kind: 'file',
			file,
			activateEditor,
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

	dispose(): void {
		this.previewRequestId += 1;

		/**
		 * Do not detach the leaf:
		 * it may be one of the user's normal editor panes.
		 */
		this.previewLeaf = null;

		this.app.workspace.detachLeavesOfType(
			FOLDER_SUMMARY_VIEW_TYPE
		);
	}

	/**
	 * Check whether the retained WorkspaceLeaf still belongs to the workspace.
	 *
	 * Do not inspect previewLeaf.view.containerEl:
	 * the view is expected to change whenever a document, image, or folder
	 * overview replaces the previous preview inside the same leaf.
	 */
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

	/**
	 * Select one pane and retain that exact WorkspaceLeaf.
	 *
	 * All arrow previews replace content inside this leaf:
	 * Markdown, images, PDFs, other native file views, and folder summaries.
	 */
	private getOrCreatePreviewLeaf(): WorkspaceLeaf {
		if (
			this.previewLeaf &&
			this.isWorkspaceLeafStillPresent(
				this.previewLeaf
			)
		) {
			return this.previewLeaf;
		}

		this.previewLeaf =
			this.app.workspace.getLeaf(false);

		return this.previewLeaf;
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
					/**
					 * Folder overview replaces the current native file view
					 * inside the retained preview leaf.
					 */
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

				/**
				 * Documents, images, PDFs, and other supported file types use
				 * Obsidian's native views inside the same retained leaf.
				 */
				await leaf.openFile(
					target.file,
					{
						active:
							target.activateEditor,
						eState: {
							focus:
								target.activateEditor,
						},
					}
				);

				if (target.activateEditor) {
					this.app.workspace.setActiveLeaf(
						leaf,
						{ focus: true }
					);
				}
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
