export interface AsciiPiece {
	id: string;
	name: string;
	content: string;
}

// Import all .txt files from pieces/ at build time via Vite's ?raw import
const pieceModules = import.meta.glob('./pieces/*.txt', { eager: true, query: '?raw', import: 'default' });

export const pieces: AsciiPiece[] = Object.entries(pieceModules).map(([path, content]) => {
	const filename = path.split('/').pop()!.replace('.txt', '');
	return {
		id: filename,
		name: filename.charAt(0).toUpperCase() + filename.slice(1),
		content: content as string
	};
});

/** Pick a piece based on the current day (rotates daily) */
export function dailyPiece(): AsciiPiece {
	const dayIndex = Math.floor(Date.now() / 86_400_000) % pieces.length;
	return pieces[dayIndex];
}

/** Get a specific piece by ID */
export function getPiece(id: string): AsciiPiece | undefined {
	return pieces.find((p) => p.id === id);
}
