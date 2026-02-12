const API_KEY = 'AIzaSyDHAMt5m6LyPIAEvulVVLlJbPjhYJbYfKU';

// 1. BUSCADOR
async function buscarEnYouTube() {
    const query = document.getElementById('search-input').value;
    if(!query) return; // No buscar si está vacío

    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=10&q=${encodeURIComponent(query)}&type=video&key=${API_KEY}`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error.message);
        }
        
        mostrarResultados(data.items);
    } catch (error) {
        console.error("Error en API de YouTube:", error);
        alert("Error en la búsqueda: " + error.message);
    }
}

// 2. RENDERIZAR RESULTADOS
function mostrarResultados(videos) {
    const resultsGrid = document.getElementById('results-grid');
    resultsGrid.innerHTML = ''; 

    videos.forEach(video => {
        const card = document.createElement('div');
        card.className = 'card';
        // Usamos una función anónima para pasar los datos correctamente
        card.onclick = () => reproducirVideo(video.id.videoId, video.snippet.title, video.snippet.thumbnails.medium.url);

        card.innerHTML = `
            <img src="${video.snippet.thumbnails.medium.url}" alt="Cover">
            <p>${video.snippet.title}</p>
            <span>${video.snippet.channelTitle}</span>
        `;
        resultsGrid.appendChild(card);
    });
}

// 3. REPRODUCTOR (EL MOTOR)
async function reproducirVideo(videoId, titulo, portada) {
    const audioPlayer = document.getElementById('audio-player');
    const currentTitle = document.getElementById('current-title');
    
    currentTitle.innerText = "Conectando...";

    // Probemos con una instancia diferente que suele ser más permisiva
    const instancia = "https://invidious.projectsegfau.lt"; 

    try {
        const response = await fetch(`${instancia}/api/v1/videos/${videoId}`);
        
        if (!response.ok) {
            throw new Error(`Servidor respondió con status: ${response.status}`);
        }
        
        const data = await response.json();
        const audioStream = data.adaptiveFormats.find(f => f.itag === "140" || f.type.includes("audio/mp4"));

        if (audioStream && audioStream.url) {
            // USAR UN PROXY PARA EL STREAM SI ES NECESARIO
            audioPlayer.src = audioStream.url;
            audioPlayer.play().catch(e => {
                currentTitle.innerText = "Haz clic en PLAY manualmente";
                console.warn("Autoplay bloqueado:", e);
            });
            
            currentTitle.innerText = titulo;
            configurarMediaSession(titulo, portada);
        } else {
            throw new Error("No hay formato de audio disponible");
        }
    } catch (error) {
        // AQUÍ ESTÁ EL CAMBIO: Ahora sí veremos el error real en la pantalla
        console.error("Detalle del error:", error);
        currentTitle.innerText = "Error: " + error.message; 
        
        if (error.message === "Failed to fetch") {
            currentTitle.innerText = "Error de CORS: Intenta abrir la app fuera de CodePen";
        }
    }
}

// 4. CONTROL DE PANTALLA APAGADA
function configurarMediaSession(titulo, portada) {
    if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: titulo,
            artist: 'Mi Música Gym',
            artwork: [{ src: portada, sizes: '512x512', type: 'image/jpeg' }]
        });

        navigator.mediaSession.setActionHandler('play', () => document.getElementById('audio-player').play());
        navigator.mediaSession.setActionHandler('pause', () => document.getElementById('audio-player').pause());
    }
}

// 5. EVENTOS
document.getElementById('search-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') buscarEnYouTube();
});