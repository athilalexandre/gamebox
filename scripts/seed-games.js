import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GAMES_FILE = path.join(__dirname, '../data/games.json');

const platforms = {
    'Arcade': [
        { name: 'Pac-Man', year: 1980, rarity: 'E' },
        { name: 'Donkey Kong', year: 1981, rarity: 'E' },
        { name: 'Galaga', year: 1981, rarity: 'E' },
        { name: 'Space Invaders', year: 1978, rarity: 'E' },
        { name: 'Street Fighter II', year: 1991, rarity: 'C' },
        { name: 'Mortal Kombat', year: 1992, rarity: 'C' },
        { name: 'Metal Slug', year: 1996, rarity: 'C' },
        { name: 'Tetris', year: 1984, rarity: 'D' },
        { name: 'Pong', year: 1972, rarity: 'E' },
        { name: 'Asteroids', year: 1979, rarity: 'E' }
    ],
    'NES': [
        { name: 'Super Mario Bros.', year: 1985, rarity: 'D' },
        { name: 'Super Mario Bros. 3', year: 1988, rarity: 'C' },
        { name: 'The Legend of Zelda', year: 1986, rarity: 'C' },
        { name: 'Metroid', year: 1986, rarity: 'C' },
        { name: 'Mega Man 2', year: 1988, rarity: 'C' },
        { name: 'Castlevania', year: 1986, rarity: 'C' },
        { name: 'Final Fantasy', year: 1987, rarity: 'B' },
        { name: 'Contra', year: 1987, rarity: 'D' },
        { name: 'Punch-Out!!', year: 1987, rarity: 'D' },
        { name: 'Kirby\'s Adventure', year: 1993, rarity: 'D' },
        { name: 'Ninja Gaiden', year: 1988, rarity: 'B' },
        { name: 'Duck Hunt', year: 1984, rarity: 'E' },
        { name: 'Dragon Quest III', year: 1988, rarity: 'A' },
        { name: 'Mother (EarthBound Zero)', year: 1989, rarity: 'A' },
        { name: 'Battletoads', year: 1991, rarity: 'B' }
    ],
    'SNES': [
        { name: 'Super Mario World', year: 1990, rarity: 'D' },
        { name: 'The Legend of Zelda: A Link to the Past', year: 1991, rarity: 'B' },
        { name: 'Super Metroid', year: 1994, rarity: 'A' },
        { name: 'Chrono Trigger', year: 1995, rarity: 'S' },
        { name: 'Final Fantasy VI', year: 1994, rarity: 'A' },
        { name: 'EarthBound', year: 1994, rarity: 'A+' },
        { name: 'Donkey Kong Country', year: 1994, rarity: 'C' },
        { name: 'Street Fighter II Turbo', year: 1993, rarity: 'C' },
        { name: 'Mega Man X', year: 1993, rarity: 'B' },
        { name: 'Secret of Mana', year: 1993, rarity: 'A' },
        { name: 'Super Mario RPG', year: 1996, rarity: 'A' },
        { name: 'F-Zero', year: 1990, rarity: 'D' },
        { name: 'Star Fox', year: 1993, rarity: 'D' },
        { name: 'Yoshi\'s Island', year: 1995, rarity: 'B' },
        { name: 'Terranigma', year: 1995, rarity: 'S' }
    ],
    'N64': [
        { name: 'Super Mario 64', year: 1996, rarity: 'C' },
        { name: 'The Legend of Zelda: Ocarina of Time', year: 1998, rarity: 'S' },
        { name: 'GoldenEye 007', year: 1997, rarity: 'B' },
        { name: 'The Legend of Zelda: Majora\'s Mask', year: 2000, rarity: 'A' },
        { name: 'Super Smash Bros.', year: 1999, rarity: 'B' },
        { name: 'Mario Kart 64', year: 1996, rarity: 'C' },
        { name: 'Star Fox 64', year: 1997, rarity: 'C' },
        { name: 'Banjo-Kazooie', year: 1998, rarity: 'B' },
        { name: 'Perfect Dark', year: 2000, rarity: 'A' },
        { name: 'Paper Mario', year: 2000, rarity: 'A' },
        { name: 'Conker\'s Bad Fur Day', year: 2001, rarity: 'S' },
        { name: 'F-Zero X', year: 1998, rarity: 'B' },
        { name: 'Donkey Kong 64', year: 1999, rarity: 'C' },
        { name: 'Mario Party 2', year: 1999, rarity: 'C' },
        { name: 'Pokemon Stadium', year: 1999, rarity: 'D' }
    ],
    'GameCube': [
        { name: 'Super Smash Bros. Melee', year: 2001, rarity: 'A' },
        { name: 'Metroid Prime', year: 2002, rarity: 'A' },
        { name: 'The Legend of Zelda: The Wind Waker', year: 2002, rarity: 'A' },
        { name: 'Resident Evil 4', year: 2005, rarity: 'B' },
        { name: 'Super Mario Sunshine', year: 2002, rarity: 'B' },
        { name: 'Luigi\'s Mansion', year: 2001, rarity: 'C' },
        { name: 'Paper Mario: The Thousand-Year Door', year: 2004, rarity: 'S' },
        { name: 'Pikmin 2', year: 2004, rarity: 'A' },
        { name: 'F-Zero GX', year: 2003, rarity: 'A+' },
        { name: 'Eternal Darkness', year: 2002, rarity: 'S' },
        { name: 'Animal Crossing', year: 2001, rarity: 'C' },
        { name: 'Fire Emblem: Path of Radiance', year: 2005, rarity: 'SSS' },
        { name: 'Mario Kart: Double Dash', year: 2003, rarity: 'B' },
        { name: 'Metal Gear Solid: The Twin Snakes', year: 2004, rarity: 'S' },
        { name: 'Skies of Arcadia Legends', year: 2002, rarity: 'SS' }
    ],
    'PS1': [
        { name: 'Final Fantasy VII', year: 1997, rarity: 'S' },
        { name: 'Metal Gear Solid', year: 1998, rarity: 'A' },
        { name: 'Castlevania: Symphony of the Night', year: 1997, rarity: 'A+' },
        { name: 'Resident Evil 2', year: 1998, rarity: 'B' },
        { name: 'Silent Hill', year: 1999, rarity: 'A' },
        { name: 'Gran Turismo 2', year: 1999, rarity: 'C' },
        { name: 'Tekken 3', year: 1998, rarity: 'C' },
        { name: 'Final Fantasy IX', year: 2000, rarity: 'A' },
        { name: 'Chrono Cross', year: 1999, rarity: 'A' },
        { name: 'Xenogears', year: 1998, rarity: 'S' },
        { name: 'Spyro the Dragon', year: 1998, rarity: 'D' },
        { name: 'Crash Bandicoot 3: Warped', year: 1998, rarity: 'C' },
        { name: 'Tony Hawk\'s Pro Skater 2', year: 2000, rarity: 'B' },
        { name: 'Vagrant Story', year: 2000, rarity: 'S' },
        { name: 'Suikoden II', year: 1998, rarity: 'SSS' }
    ],
    'PS2': [
        { name: 'Grand Theft Auto: San Andreas', year: 2004, rarity: 'C' },
        { name: 'Shadow of the Colossus', year: 2005, rarity: 'SS' },
        { name: 'Metal Gear Solid 3: Snake Eater', year: 2004, rarity: 'A' },
        { name: 'God of War II', year: 2007, rarity: 'B' },
        { name: 'Final Fantasy X', year: 2001, rarity: 'B' },
        { name: 'Kingdom Hearts II', year: 2005, rarity: 'B' },
        { name: 'Silent Hill 2', year: 2001, rarity: 'A+' },
        { name: 'Resident Evil 4', year: 2005, rarity: 'B' },
        { name: 'Okami', year: 2006, rarity: 'A' },
        { name: 'Devil May Cry 3', year: 2005, rarity: 'B' },
        { name: 'Persona 4', year: 2008, rarity: 'A' },
        { name: 'Ico', year: 2001, rarity: 'A' },
        { name: 'Burnout 3: Takedown', year: 2004, rarity: 'C' },
        { name: 'Katamari Damacy', year: 2004, rarity: 'A' },
        { name: 'Rule of Rose', year: 2006, rarity: 'SSS' }
    ],
    'Xbox': [
        { name: 'Halo: Combat Evolved', year: 2001, rarity: 'A' },
        { name: 'Halo 2', year: 2004, rarity: 'B' },
        { name: 'Star Wars: KOTOR', year: 2003, rarity: 'A' },
        { name: 'Fable', year: 2004, rarity: 'B' },
        { name: 'Ninja Gaiden Black', year: 2005, rarity: 'A' },
        { name: 'The Elder Scrolls III: Morrowind', year: 2002, rarity: 'A' },
        { name: 'Splinter Cell: Chaos Theory', year: 2005, rarity: 'B' },
        { name: 'Jade Empire', year: 2005, rarity: 'B' },
        { name: 'Panzer Dragoon Orta', year: 2002, rarity: 'S' },
        { name: 'Jet Set Radio Future', year: 2002, rarity: 'A' },
        { name: 'Steel Battalion', year: 2002, rarity: 'SSS' },
        { name: 'Forza Motorsport', year: 2005, rarity: 'C' },
        { name: 'Project Gotham Racing 2', year: 2003, rarity: 'C' },
        { name: 'Psychonauts', year: 2005, rarity: 'A' },
        { name: 'Conker: Live & Reloaded', year: 2005, rarity: 'A' }
    ],
    'PC': [
        { name: 'Half-Life 2', year: 2004, rarity: 'S' },
        { name: 'The Witcher 3: Wild Hunt', year: 2015, rarity: 'SS' },
        { name: 'Portal 2', year: 2011, rarity: 'A+' },
        { name: 'Minecraft', year: 2011, rarity: 'C' },
        { name: 'World of Warcraft', year: 2004, rarity: 'C' },
        { name: 'Doom', year: 1993, rarity: 'B' },
        { name: 'Deus Ex', year: 2000, rarity: 'A' },
        { name: 'Baldur\'s Gate II', year: 2000, rarity: 'A' },
        { name: 'Diablo II', year: 2000, rarity: 'B' },
        { name: 'StarCraft', year: 1998, rarity: 'B' },
        { name: 'Counter-Strike 1.6', year: 2000, rarity: 'C' },
        { name: 'The Sims', year: 2000, rarity: 'D' },
        { name: 'Age of Empires II', year: 1999, rarity: 'C' },
        { name: 'System Shock 2', year: 1999, rarity: 'S' },
        { name: 'Disco Elysium', year: 2019, rarity: 'SS' }
    ],
    'Modern': [
        { name: 'Elden Ring', year: 2022, rarity: 'SSS' },
        { name: 'Baldur\'s Gate 3', year: 2023, rarity: 'SSS' },
        { name: 'The Legend of Zelda: BOTW', year: 2017, rarity: 'SS' },
        { name: 'The Legend of Zelda: TOTK', year: 2023, rarity: 'SS' },
        { name: 'God of War Ragnarok', year: 2022, rarity: 'S' },
        { name: 'Red Dead Redemption 2', year: 2018, rarity: 'S' },
        { name: 'The Last of Us Part II', year: 2020, rarity: 'S' },
        { name: 'Cyberpunk 2077', year: 2020, rarity: 'A' },
        { name: 'Hades', year: 2020, rarity: 'A' },
        { name: 'Hollow Knight', year: 2017, rarity: 'A+' },
        { name: 'Celeste', year: 2018, rarity: 'A' },
        { name: 'Stardew Valley', year: 2016, rarity: 'B' },
        { name: 'Persona 5 Royal', year: 2019, rarity: 'S' },
        { name: 'Sekiro: Shadows Die Twice', year: 2019, rarity: 'SS' },
        { name: 'Bloodborne', year: 2015, rarity: 'SS' }
    ]
};

let allGames = [];
let idCounter = 1;

for (const [consoleName, games] of Object.entries(platforms)) {
    games.forEach(game => {
        allGames.push({
            id: idCounter++,
            name: game.name,
            rarity: game.rarity,
            console: consoleName === 'Modern' ? 'Multi' : consoleName,
            releaseYear: game.year
        });
    });
}

fs.writeFileSync(GAMES_FILE, JSON.stringify(allGames, null, 2));
console.log(`✅ Gerado ${allGames.length} jogos em ${GAMES_FILE}`);
