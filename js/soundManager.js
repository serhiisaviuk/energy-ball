class SoundManager {
    constructor() {
        this.sounds = {
            intro: new Audio('assets/sounds/intro.mp3'),
            gameplay: new Audio('assets/sounds/gameplay.mp3'),
            kill: new Audio('assets/sounds/kill.mp3'),
            win: new Audio('assets/sounds/win.mp3'),
            lose: new Audio('assets/sounds/lose.mp3')
        };
        
        // Set default volume and loop for background music
        this.sounds.intro.loop = true;
        this.sounds.gameplay.loop = true;
        
        this.setVolume(50);
    }
    
    setVolume(volume) {
        const normalizedVolume = volume / 100;
        
        for (const sound in this.sounds) {
            this.sounds[sound].volume = normalizedVolume;
        }
    }
    
    play(soundName) {
        if (this.sounds[soundName]) {
            // Stop the sound first in case it's already playing
            this.sounds[soundName].currentTime = 0;
            this.sounds[soundName].play();
        }
    }
    
    stop(soundName) {
        if (this.sounds[soundName]) {
            this.sounds[soundName].pause();
            this.sounds[soundName].currentTime = 0;
        }
    }
    
    stopAll() {
        for (const sound in this.sounds) {
            this.stop(sound);
        }
    }
} 