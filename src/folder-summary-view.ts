import { ItemView, TFile, TFolder, WorkspaceLeaf, setIcon } from 'obsidian';

export const FOLDER_SUMMARY_VIEW_TYPE = 'tw-arrow-nav-folder-summary';

interface FolderMetrics {
	directFilesCount: number;
	directFoldersCount: number;
	totalFilesCount: number;
	totalFoldersCount: number;
	totalSizeBytes: number;
	totalTasksCount: number;
	completedTasksCount: number;
	totalOutgoingLinksCount: number;
	totalIncomingBacklinksCount: number;
	orphanNotesCount: number;
	recentFiles: TFile[];
}

function formatBytes(bytes: number): string {
	if (bytes === 0) return '0 B';
	const k = 1024;
	const sizes = ['B', 'KB', 'MB', 'GB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatRelativeTime(mtime: number): string {
	const now = Date.now();
	const diff = now - mtime;
	const secs = Math.floor(diff / 1000);
	const mins = Math.floor(secs / 60);
	const hours = Math.floor(mins / 60);
	const days = Math.floor(hours / 24);

	if (days > 0) return days === 1 ? 'Yesterday' : `${days} days ago`;
	if (hours > 0) return `${hours}h ago`;
	if (mins > 0) return `${mins}m ago`;
	return 'Just now';
}

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
			const emptyMsg = container.createEl('div', { cls: 'tw-folder-summary' });
			emptyMsg.createEl('p', { text: 'No folder selected.' });
			return;
		}

		const abstractFile = this.app.vault.getAbstractFileByPath(this.folderPath);

		if (!(abstractFile instanceof TFolder)) {
			const errorMsg = container.createEl('div', { cls: 'tw-folder-summary' });
			errorMsg.createEl('p', { text: 'The selected folder no longer exists.' });
			return;
		}

		const metrics = this.getFolderMetrics(abstractFile);

		const wrapper = container.createEl('div', { cls: 'tw-folder-summary' });

		// Header Section
		const header = wrapper.createEl('div', { cls: 'tw-folder-summary-header' });
		const titleContainer = header.createEl('h2', { cls: 'tw-folder-summary-title' });
		
		const folderIconSpan = titleContainer.createSpan();
		setIcon(folderIconSpan, 'folder');
		
		titleContainer.createSpan({ text: ` ${abstractFile.name}` });
		
		header.createEl('div', { cls: 'tw-folder-summary-path', text: abstractFile.path || '/' });

		// Stats Grid
		const grid = wrapper.createEl('div', { cls: 'tw-folder-summary-grid' });

		// Card 1: Files & Folders
		const filesCard = grid.createEl('div', { cls: 'tw-folder-summary-card' });
		filesCard.createEl('div', { cls: 'tw-folder-summary-card-val', text: String(metrics.totalFilesCount) });
		const filesLabel = filesCard.createEl('div', { cls: 'tw-folder-summary-card-lbl' });
		setIcon(filesLabel.createSpan(), 'file-text');
		filesLabel.createSpan({ text: ' Total Files' });
		filesCard.createEl('div', {
			cls: 'tw-folder-summary-card-sub',
			text: `${metrics.directFilesCount} direct • ${metrics.totalFoldersCount} folders • ${formatBytes(metrics.totalSizeBytes)}`
		});

		// Card 2: Checklists Progress
		const tasksCard = grid.createEl('div', { cls: 'tw-folder-summary-card' });
		const taskPct = metrics.totalTasksCount > 0 
			? Math.round((metrics.completedTasksCount / metrics.totalTasksCount) * 100) 
			: 0;
		
		tasksCard.createEl('div', { 
			cls: 'tw-folder-summary-card-val', 
			text: metrics.totalTasksCount > 0 ? `${taskPct}%` : '0%' 
		});
		
		const tasksLabel = tasksCard.createEl('div', { cls: 'tw-folder-summary-card-lbl' });
		setIcon(tasksLabel.createSpan(), 'check-square');
		tasksLabel.createSpan({ text: ' Checklist Progress' });
		
		tasksCard.createEl('div', {
			cls: 'tw-folder-summary-card-sub',
			text: `${metrics.completedTasksCount} of ${metrics.totalTasksCount} tasks completed`
		});

		// Progress Bar
		const progressBar = tasksCard.createEl('div', { cls: 'tw-folder-summary-progress-bar' });
		progressBar.createEl('div', { 
			cls: 'tw-folder-summary-progress-fill', 
			attr: { style: `width: ${taskPct}%` } 
		});

		// Card 3: Link Connections
		const linksCard = grid.createEl('div', { cls: 'tw-folder-summary-card' });
		linksCard.createEl('div', { cls: 'tw-folder-summary-card-val', text: String(metrics.totalOutgoingLinksCount) });
		const linksLabel = linksCard.createEl('div', { cls: 'tw-folder-summary-card-lbl' });
		setIcon(linksLabel.createSpan(), 'link');
		linksLabel.createSpan({ text: ' Outbound Links' });
		linksCard.createEl('div', {
			cls: 'tw-folder-summary-card-sub',
			text: `${metrics.totalIncomingBacklinksCount} incoming backlinks • ${metrics.orphanNotesCount} orphan notes`
		});

		// Recent Activity Section
		if (metrics.recentFiles.length > 0) {
			const recentSection = wrapper.createEl('div', { cls: 'tw-folder-summary-recent' });
			const recentTitle = recentSection.createEl('h3');
			setIcon(recentTitle.createSpan(), 'clock');
			recentTitle.createSpan({ text: ' Recently Modified Notes' });

			const list = recentSection.createEl('ul', { cls: 'tw-folder-summary-recent-list' });
			
			for (const file of metrics.recentFiles) {
				const item = list.createEl('li', { cls: 'tw-folder-summary-recent-item' });
				
				const titleDiv = item.createEl('div', { cls: 'tw-folder-summary-recent-item-title' });
				setIcon(titleDiv.createSpan(), 'file-text');
				titleDiv.createSpan({ text: file.basename });

				item.createEl('div', { 
					cls: 'tw-folder-summary-recent-item-time', 
					text: formatRelativeTime(file.stat.mtime) 
				});

				// Interaction: Click to open file
				item.addEventListener('click', (evt) => {
					evt.preventDefault();
					const leaf = this.app.workspace.getLeaf(false);
					void leaf.openFile(file);
				});
			}
		}
	}

	private getFolderMetrics(folder: TFolder): FolderMetrics {
		const files: TFile[] = [];
		let directFilesCount = 0;
		let directFoldersCount = 0;
		let totalFoldersCount = 0;

		const recurse = (currentFolder: TFolder) => {
			for (const child of currentFolder.children) {
				if (child instanceof TFile) {
					files.push(child);
				} else if (child instanceof TFolder) {
					totalFoldersCount += 1;
					recurse(child);
				}
			}
		};

		for (const child of folder.children) {
			if (child instanceof TFile) {
				directFilesCount += 1;
			} else if (child instanceof TFolder) {
				directFoldersCount += 1;
			}
		}

		recurse(folder);

		const totalFilesCount = files.length;
		let totalSizeBytes = 0;
		let totalTasksCount = 0;
		let completedTasksCount = 0;

		const localFilesPaths = new Set(files.map((f) => f.path));

		// Task counting and size counting
		for (const file of files) {
			totalSizeBytes += file.stat.size;

			const cache = this.app.metadataCache.getFileCache(file);
			if (cache && cache.listItems) {
				for (const item of cache.listItems) {
					if (item.task !== undefined) {
						totalTasksCount += 1;
						if (item.task.trim() !== '') {
							completedTasksCount += 1;
						}
					}
				}
			}
		}

		// Link counting
		const resolvedLinks = this.app.metadataCache.resolvedLinks || {};
		const outgoingLinks = new Map<string, number>();
		const incomingLinks = new Map<string, number>();

		for (const file of files) {
			outgoingLinks.set(file.path, 0);
			incomingLinks.set(file.path, 0);
		}

		for (const [sourcePath, targets] of Object.entries(resolvedLinks)) {
			const isSourceLocal = localFilesPaths.has(sourcePath);
			for (const [targetPath, count] of Object.entries(targets)) {
				if (isSourceLocal) {
					outgoingLinks.set(sourcePath, (outgoingLinks.get(sourcePath) || 0) + count);
				}
				if (localFilesPaths.has(targetPath)) {
					incomingLinks.set(targetPath, (incomingLinks.get(targetPath) || 0) + count);
				}
			}
		}

		let totalOutgoingLinksCount = 0;
		let totalIncomingBacklinksCount = 0;
		let orphanNotesCount = 0;

		for (const file of files) {
			const outVal = outgoingLinks.get(file.path) || 0;
			const inVal = incomingLinks.get(file.path) || 0;

			totalOutgoingLinksCount += outVal;
			totalIncomingBacklinksCount += inVal;

			if (outVal === 0 && inVal === 0) {
				orphanNotesCount += 1;
			}
		}

		const recentFiles = [...files]
			.sort((a, b) => b.stat.mtime - a.stat.mtime)
			.slice(0, 5);

		return {
			directFilesCount,
			directFoldersCount,
			totalFilesCount,
			totalFoldersCount,
			totalSizeBytes,
			totalTasksCount,
			completedTasksCount,
			totalOutgoingLinksCount,
			totalIncomingBacklinksCount,
			orphanNotesCount,
			recentFiles,
		};
	}
}

