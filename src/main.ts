import { Plugin } from 'obsidian';
import { ExplorerNavigation } from './explorer-navigation';
import { FolderSummaryView, FOLDER_SUMMARY_VIEW_TYPE } from './folder-summary-view';
import { PreviewController } from './preview-controller';

export default class FileNavPlugin extends Plugin {
	private navigation!: ExplorerNavigation;
	private preview!: PreviewController;

	onload() {
		this.registerView(FOLDER_SUMMARY_VIEW_TYPE, (leaf) => new FolderSummaryView(leaf));

		this.preview = new PreviewController(this.app);
		this.navigation = new ExplorerNavigation(this.app, this.preview);
		this.navigation.register(this);
	}

	onunload() {
		this.navigation?.dispose();
		this.preview?.dispose();
	}
}
