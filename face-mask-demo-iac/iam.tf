# Get AWS account ID
data "aws_caller_identity" "current" {}

resource "aws_iam_openid_connect_provider" "github" {
	url = "https://token.actions.githubusercontent.com"
	client_id_list = ["sts.amazonaws.com"]
	thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}

resource "aws_iam_role" "github_actions_deploy" {
	name = "github-actions-deploy"

	assume_role_policy = jsonencode({
		Version = "2012-10-17"
		Statement = [
			{
				Effect = "Allow"
				Principal = {
					Federated = aws_iam_openid_connect_provider.github.arn
				}
				Action = "sts:AssumeRoleWithWebIdentity"
				Condition = {
					StringLike = {
						"token.actions.githubusercontent.com:sub" = "repo:alexretana/face-mask-classifier-demo:ref:refs/heads/main"
					}
				}
			}
		]
	})
}

resource "aws_iam_role_policy" "github_actions_policy" {
	name = "github-action-policy"
	role = aws_iam_role.github_actions_deploy.id

	policy = jsonencode({
		Version = "2012-10-17"
		Statement = [
			{
				Effect = "Allow"
				Action = ["s3:PutObject", "s3:PutObjectAcl", "s3:DeleteObject"]
				Resource = "${aws_s3_bucket.website_bucket.arn}/*"
			},
			{
				Effect = "Allow"
				Action = ["cloudfront:CreateInvalidation"]
				Resource = "arn:aws:cloudfront::${data.aws_caller_identity.current.account_id}:distribution/${aws_cloudfront_distribution.website_cdn.id}"
			}
		]
	})
}