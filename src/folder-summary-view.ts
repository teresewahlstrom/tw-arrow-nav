import { ItemView, TFile, TFolder, WorkspaceLeaf } from 'obsidian';

export const FOLDER_SUMMARY_VIEW_TYPE = 'tw-arrow-nav-folder-summary';

export class FolderSummaryView extends ItemView {
	private folderPath: string | null = null;

	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
	}

	getViewType() {
		return FOLDER_SUMMARY_VIEW_TYPE;
	}

	getDisplayText() {
		if (!this.folderPath) return 'Folder summary';

		const folder = this.app.vault.getAbstractFileByPath(this.folderPath);

		return folder instanceof TFolder ? folder.name : 'Folder summary';
	}

	getIcon() {
		return 'folder';
	}

	getState() {
		return {
			folderPath: this.folderPath,
		};
	}

	async setState(state: unknown) {
		const folderPath =
			typeof (state as { folderPath?: unknown } | null)?.folderPath === 'string'
				? (state as { folderPath: string }).folderPath
				: null;

		this.folderPath = folderPath;
		await this.render();
	}

	async onOpen() {
		await this.render();
	}

	private async render() {
		const container = this.contentEl;
		container.empty();

		if (!this.folderPath) {
			container.createEl('p', { text: 'No folder selected.' });
			return;
		}

		const abstractFile = this.app.vault.getAbstractFileByPath(this.folderPath);

		if (!(abstractFile instanceof TFolder)) {
			container.createEl('p', { text: 'The selected folder no longer exists.' });
			return;
		}

		const metrics = this.getFolderMetrics(abstractFile);

		container.createEl('h2', { text: abstractFile.name });
		container.createEl('p', { text: abstractFile.path });

		const list = container.createEl('ul');
		list.createEl('li', { text: `Direct files: ${metrics.directFiles}` });
		list.createEl('li', { text: `Direct subfolders: ${metrics.directFolders}` });
		list.createEl('li', { text: `Total files: ${metrics.totalFiles}` });
		list.createEl('li', { text: `Total subfolders: ${metrics.totalFolders}` });
	}

	private getFolderMetrics(folder: TFolder) {
		let directFiles = 0;
		let directFolders = 0;
		let totalFiles = 0;
		let totalFolders = 0;

		const countDescendants = (currentFolder: TFolder) => {
			for (const child of currentFolder.children) {
				if (child instanceof TFile) {
					totalFiles += 1;
					continue;
				}

				if (child instanceof TFolder) {
					totalFolders += 1;
					countDescendants(child);
				}
			}
		};

		for (const child of folder.children) {
			if (child instanceof TFile) {
				directFiles += 1;
				continue;
			}

			if (child instanceof TFolder) {
				directFolders += 1;
			}
		}

		countDescendants(folder);

		return {
			directFiles,
			directFolders,
			totalFiles,
			totalFolders,
		};
	}
}
