export const folderStructureRules = {
	enforcement: {
		updateRequired: true,
		onFileChanges: ["new-file", "move-file", "delete-file"],
		documentPath: "docs/folder-structure.md",
		blockCommitIfNotUpdated: true,
	},
	validation: {
		checkStructure: true,
		validatePaths: true,
		requireDescription: true,
	},
	notifications: {
		warning: "⚠️ Folder structure documentation needs to be updated",
		error: "❌ Cannot commit: Update folder-structure.md first",
	},
}
