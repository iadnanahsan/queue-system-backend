import {ref} from "vue"

export const useAnnouncement = () => {
	const audio = ref<HTMLAudioElement | null>(null)
	const isPlaying = ref(false)

	const playAnnouncement = async (data: {audio: string; queueNumber: string; counter: number; text: string}) => {
		if (isPlaying.value) return

		try {
			isPlaying.value = true

			if (data.audio) {
				// Create audio from base64
				const blob = new Blob([Buffer.from(data.audio, "base64")], {type: "audio/mp3"})
				const audioUrl = URL.createObjectURL(blob)

				// Create and play audio
				audio.value = new Audio(audioUrl)
				await new Promise((resolve, reject) => {
					if (!audio.value) return reject("No audio instance")

					audio.value.onended = resolve
					audio.value.onerror = reject
					audio.value.play()
				})

				// Cleanup
				URL.revokeObjectURL(audioUrl)
			} else {
				// Fallback to browser speech synthesis
				const utterance = new SpeechSynthesisUtterance(data.text)
				utterance.lang = "ar"
				utterance.rate = 0.7
				window.speechSynthesis.speak(utterance)
				await new Promise((resolve) => {
					utterance.onend = resolve
				})
			}
		} catch (error) {
			console.error("Audio playback failed:", error)
		} finally {
			isPlaying.value = false
			if (audio.value) {
				audio.value = null
			}
		}
	}

	return {
		playAnnouncement,
		isPlaying,
	}
}
