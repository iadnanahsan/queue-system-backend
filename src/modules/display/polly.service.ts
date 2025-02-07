import {Injectable} from "@nestjs/common"
import {
	PollyClient,
	SynthesizeSpeechCommand,
	Engine,
	OutputFormat,
	TextType,
	SynthesizeSpeechCommandInput,
} from "@aws-sdk/client-polly"
import {ConfigService} from "@nestjs/config"

@Injectable()
export class PollyService {
	private readonly pollyClient: PollyClient

	constructor(private configService: ConfigService) {
		this.pollyClient = new PollyClient({
			region: this.configService.get<string>("AWS_REGION"),
			credentials: {
				accessKeyId: this.configService.get<string>("AWS_ACCESS_KEY"),
				secretAccessKey: this.configService.get<string>("AWS_SECRET_KEY"),
			},
		})
	}

	async synthesizeSpeech(text: string): Promise<Buffer> {
		const params: SynthesizeSpeechCommandInput = {
			Engine: "neural",
			LanguageCode: "arb", // Modern Standard Arabic
			Text: text,
			OutputFormat: "mp3",
			TextType: "text",
			VoiceId: "Hala",
			SampleRate: "24000", // Optional but recommended for Arabic
		}

		try {
			const command = new SynthesizeSpeechCommand(params)
			const response = await this.pollyClient.send(command)

			if (!response.AudioStream) {
				throw new Error("No audio stream returned")
			}

			return Buffer.from(await response.AudioStream.transformToByteArray())
		} catch (error) {
			console.error("Error synthesizing speech:", error)
			throw error
		}
	}
}
