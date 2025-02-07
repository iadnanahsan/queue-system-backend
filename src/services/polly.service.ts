import {Injectable} from "@nestjs/common"
import * as AWS from "aws-sdk"
import {ConfigService} from "@nestjs/config"

@Injectable()
export class PollyService {
	private polly: AWS.Polly
	private readonly cache: Map<string, Buffer> = new Map()

	constructor(private configService: ConfigService) {
		this.polly = new AWS.Polly({
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

			const params = {
				Engine: this.configService.get<string>("AWS_POLLY_ENGINE"),
				Text: text,
				OutputFormat: "mp3",
				VoiceId: this.configService.get<string>("AWS_POLLY_VOICE_ID"),
				LanguageCode: this.configService.get<string>("AWS_POLLY_LANGUAGE_CODE"),
				TextType: "text",
			}

			const {AudioStream} = await this.polly.synthesizeSpeech(params).promise()
			const audioBuffer = Buffer.from(AudioStream as Buffer)

			// Cache the audio
			this.cache.set(cacheKey, audioBuffer)

			return audioBuffer.toString("base64")
		} catch (error) {
			console.error("Polly synthesis error:", error)
			throw error
		}
	}
}
