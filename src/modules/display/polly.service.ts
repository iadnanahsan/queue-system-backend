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
		const region = this.configService.get<string>("AWS_REGION")
		const accessKeyId = this.configService.get<string>("AWS_ACCESS_KEY")
		const secretAccessKey = this.configService.get<string>("AWS_SECRET_KEY")

		if (!region || !accessKeyId || !secretAccessKey) {
			throw new Error("AWS credentials not properly configured")
		}

		// Log masked credentials for debugging
		console.log("AWS Config:", {
			region,
			accessKeyId: accessKeyId.substring(0, 4) + "...",
			hasSecretKey: !!secretAccessKey,
		})

		this.pollyClient = new PollyClient({
			region,
			credentials: {accessKeyId, secretAccessKey},
		})
	}

	async synthesizeSpeech(text: string): Promise<Buffer> {
		console.log("PollyService: Starting synthesis for text:", text)

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
			console.log("PollyService: Sending request to AWS...")
			const command = new SynthesizeSpeechCommand(params)
			const response = await this.pollyClient.send(command)
			console.log("PollyService: Got response from AWS")

			if (!response.AudioStream) {
				console.error("PollyService: No audio stream in response")
				throw new Error("No audio stream returned")
			}

			const buffer = Buffer.from(await response.AudioStream.transformToByteArray())
			console.log("PollyService: Successfully created buffer of size:", buffer.length)
			return buffer
		} catch (error) {
			console.error("PollyService Error:", error)
			throw error
		}
	}
}
