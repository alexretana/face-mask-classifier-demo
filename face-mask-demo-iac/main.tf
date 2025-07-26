########################################
### Route53 zone
########################################
data "aws_route53_zone" "retanatech_com" {
	name = "retanatech.com"
}

########################################
### ACM certificate & DNS validation
########################################
resource "aws_acm_certificate" "demo_cert" {
	domain_name = "face-mask-classifier-demo.retanatech.com"
	validation_method = "DNS"

	tags = {
		Name = "Face Mask Classifier Demo Cert"
	}
}

resource "aws_route53_record" "demo_cert_validation" {
	for_each = {
		for dvo in aws_acm_certificate.demo_cert.domain_validation_options : dvo.domain_name => {
			name = dvo.resource_record_name
			type = dvo.resource_record_type
			record = dvo.resource_record_value
		}
	}

	zone_id = data.aws_route53_zone.retanatech_com.zone_id
	name = each.value.name
	type = each.value.type
	ttl = 300
	records = [each.value.record]
}

# Wait for validation
resource "aws_acm_certificate_validation" "demo_cert_validation" {
	certificate_arn = aws_acm_certificate.demo_cert.arn
	validation_record_fqdns = [for record in aws_route53_record.demo_cert_validation : record.fqdn]
}

########################################
### S3 Bucket and bucket policies
########################################
resource "aws_s3_bucket" "website_bucket" {
	bucket = var.bucket_name

	tags = {
		Name = "Face Mask Demo Site"
	}
}

resource "aws_s3_bucket_website_configuration" "website" {
	bucket = aws_s3_bucket.website_bucket.id

	index_document {
		suffix = "index.html"
	}

	error_document {
		key = "index.html"
	}
}

resource "aws_s3_bucket_public_access_block" "public_access" {
	bucket = aws_s3_bucket.website_bucket.id

	block_public_acls = false
	block_public_policy = false
	ignore_public_acls = false
	restrict_public_buckets = false
}

resource "aws_s3_bucket_policy" "public_read" {
	bucket = aws_s3_bucket.website_bucket.id

	policy = jsonencode({
		Version = "2012-10-17"
		Statement = [
			{
				Effect = "Allow"
				Principal = {
					Service = "cloudfront.amazonaws.com"
				}
				Condition = {
					StringEquals = {
						"AWS:SourceArn" = aws_cloudfront_distribution.website_cdn.arn
					}
				}
				Action = ["s3:GetObject"]
				Resource = "${aws_s3_bucket.website_bucket.arn}/*"
			}
		]
	})
}

########################################
### CloudFront & OAC
########################################
resource "aws_cloudfront_origin_access_control" "s3_oac" {
	name = "face-mask-classifier-demo-oac"
	description = "OAC for S3 bucket"
	origin_access_control_origin_type = "s3"
	signing_behavior = "always"
	signing_protocol = "sigv4"
}

resource "aws_cloudfront_distribution" "website_cdn" {
	enabled = true
	default_root_object = "index.html"

	depends_on = [aws_acm_certificate_validation.demo_cert_validation]

	origin {
		domain_name = aws_s3_bucket.website_bucket.bucket_regional_domain_name
		origin_id = "s3-face-mask-demo"
		origin_access_control_id = aws_cloudfront_origin_access_control.s3_oac.id
	}

	default_cache_behavior {
		allowed_methods = ["GET", "HEAD"]
		cached_methods = ["GET", "HEAD"]
		target_origin_id = "s3-face-mask-demo"

		viewer_protocol_policy = "redirect-to-https"

		forwarded_values {
			query_string = false
			cookies {
				forward = "none"
			}
		}
	}

	aliases = ["face-mask-classifier-demo.retanatech.com"]

	viewer_certificate {
		acm_certificate_arn = aws_acm_certificate.demo_cert.arn
		ssl_support_method = "sni-only"
		minimum_protocol_version = "TLSv1.2_2021"
	}

	restrictions {
		geo_restriction {
			restriction_type = "none"
		}
	}

	price_class = "PriceClass_100"

	tags = {
		Name = "Face Mask Demo CDN"
	}
}

########################################
### Route53 alias record
########################################
resource "aws_route53_record" "demo_alias" {
	zone_id = data.aws_route53_zone.retanatech_com.zone_id
	name = "face-mask-classifier-demo"
	type = "A"

	alias {
		name = aws_cloudfront_distribution.website_cdn.domain_name
		zone_id = aws_cloudfront_distribution.website_cdn.hosted_zone_id
		evaluate_target_health = false
	}
}
