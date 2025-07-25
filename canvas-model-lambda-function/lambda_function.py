import json
import base64
import tempfile
from io import BytesIO
import pandas as pd
from autogluon.multimodal import MultiModalPredictor

# Load the predictor once (cold start); stays warm for later requests
predictor = MultiModalPredictor.load("model")

def lambda_handler(event, context):
	"""
	expects JSON body: { "image_base64": "..."}
	"""
	try:
		# Parse Input
		body = json.loads(event['body'])
		img_b64 = body.get('image_base64')
		if not img_b64:
			return _response(400, {"error": "Missing 'image_base64'"})

		# Decode base64 image to bytes	
		image_data = base64.b64decode(img_b64)

		# Save temporary  (AutoGluon expects file path or DataFrame)
		with tempfile.NamedTemporaryFile(suffix=".jpg") as tmp:
			tmp.write(image_data)
			tmp.flush()

			# Predict: assuming your model expects column IMAGE_COLUMN_NAME
			df = pd.DataFrame({"image": [tmp.name]})
			predicition = predictor.predict(df)
			predicted_label = prediciton[0] if hasattr(prediction, '__getitem__') else str(prediction)

			#Predict probabilities
			predict_probs = predictor.predict_proba(df)
			# Get highest probability (confidence)
			confidence = predict_probs.max(axis=1).iloc[0]

		return _response(200, {
			"prediction": predicted_label,
			"confidence": confidence
			})
	
	except Exception as e:
		return _response(500, {"error": str(e)})

	def _response(status_code, body):
		return {
			"statusCode": status_code,
			"headers": {"Content-Type": "application/json"},
			"body": json.dumps(body)
		}
