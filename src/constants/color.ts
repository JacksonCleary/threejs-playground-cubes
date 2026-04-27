import { type BlockType } from '../types/CityEntity';

export const BLOCK_COLORS: Record<BlockType, number> = {
    water: 0x22aaff,
    sand: 0xe6d8ad,
    grass: 0x61a357,
    tree: 0x2d6e32,
    stone: 0x808080,
    building_low: 0xcc8866,
    building_high: 0xddeeff,
};

export const LINE_COLORS = [
    0xe63946, // red
    0x2a9d8f, // teal
    0xe9c46a, // yellow
    0x6a4c93, // purple
    0xf4a261, // orange
    0x457b9d, // blue
];
