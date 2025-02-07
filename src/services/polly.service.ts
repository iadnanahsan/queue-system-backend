import {Injectable} from "@nestjs/common"
import {Polly, SynthesizeSpeechCommand} from "@aws-sdk/client-polly"
import {ConfigService} from "@nestjs/config"

@Injectable()
export class PollyService {
	private polly: Polly
	private readonly cache: Map<string, Buffer> = new Map()

	constructor(private configService: ConfigService) {
		this.polly = new Polly({
			region: configService.get<string>("AWS_REGION"),
			credentials: {
				accessKeyId: configService.get<string>("AWS_ACCESS_KEY"),
				secretAccessKey: configService.get<string>("AWS_SECRET_KEY"),
			},
		})
	}

	async generateAnnouncement(queueNumber: string, counterNo: number): Promise<string> {
		const text = `الرقم ${queueNumber}، الرجاء التوجه إلى نافذة الخدمة رقم ${counterNo}`
		const cacheKey = `${queueNumber}-${counterNo}`

		try {
			if (this.cache.has(cacheKey)) {
				return this.cache.get(cacheKey).toString("base64")
			}

			const command = new SynthesizeSpeechCommand({
				Engine: "neural",
				Text: text,
				OutputFormat: "mp3",
				VoiceId: "Hala",
				LanguageCode: "arb",
				TextType: "text",
			})

			const response = await this.polly.send(command)
			const audioStream = await response.AudioStream.transformToByteArray()
			const audioBuffer = Buffer.from(audioStream)

			// Cache the audio
			this.cache.set(cacheKey, audioBuffer)

			return audioBuffer.toString("base64")
		} catch (error) {
			console.error("Polly synthesis error:", error)
			throw error
		}
	}
}
