"""Athena orchestration API: the HTTP contract n8n and the web app call.

This service is the seam between the deterministic analytics (the `athena`
pipeline) and the consumers (n8n workflows, the dashboard). It computes nothing
new: it runs pipeline stages and reads the warehouse result tables, and it lets
the optional AI layer interpret that structured output.
"""

__version__ = "0.1.0"
