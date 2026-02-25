"""
LLM-powered procedural 3D model and scene generator.
Uses a Poe (Quora) API key with OpenAI-compatible chat completions format
to generate Three.js-compatible model definitions and full scenes from natural language descriptions.
"""
import json
import logging
import re
import uuid
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = logging.getLogger(__name__)

from app.core.config import settings
from app.models.scene import Scene, SceneObject
from app.models.knowledge_node import KnowledgeNode
from app.models.model3d import Model3D

router = APIRouter(prefix="/generate", tags=["generate"])


class GenerateModelRequest(BaseModel):
    description: str


SYSTEM_PROMPT = """\
You are an elite 3D technical artist. You generate hyper-detailed procedural Three.js model definitions as JSON.
Your models must look like REAL physical objects — as if 3D-scanned — built from primitive geometries.
Every model must be immediately recognizable, with anatomically or mechanically accurate proportions.

OUTPUT — return ONLY a valid JSON object (no markdown, no explanation):
{
  "slug": "kebab-case-name",
  "name": "Human Readable Name",
  "category": "general",
  "description": "Brief description",
  "tags": ["tag1", "tag2"],
  "default_animation": null,
  "parts": [ ... ]
}

PART TYPES:

1. MESH:
{
  "type": "mesh", "name": "unique_name",
  "geometry": { "type": "<type>", "args": [...] },
  "material": { "type": "standard"|"physical"|"basic", "color": "#hex", "metalness": 0-1, "roughness": 0-1, "emissive": "#hex", "emissiveIntensity": 0-2, "transparent": bool, "opacity": 0-1, "side": "front"|"double"|"back" },
  "position": [x,y,z], "rotation": [rx,ry,rz], "scale": [sx,sy,sz], "castShadow": true,
  "animation": null or { "type": "rotate"|"pulse_scale"|"sine_offset"|"hover_emissive", ... }
}

2. GROUP — hierarchical container (CRITICAL for sub-assemblies):
{
  "type": "group", "name": "assembly_name",
  "position": [x,y,z], "rotation": [rx,ry,rz],
  "children": [ <parts...> ]
}

3. LIGHT:
{
  "type": "light", "name": "glow_name", "lightType": "point"|"spot"|"directional",
  "position": [x,y,z], "color": "#hex", "intensity": 0-2, "distance": 1-10,
  "animation": { "type": "hover_glow", "hoverIntensity": 0.5, "speed": 3 }
}

GEOMETRIES:
- "box": [width, height, depth]
- "sphere": [radius, wSeg, hSeg] — use [r, 64, 64] for smooth organic shapes
- "cylinder": [rTop, rBot, height, segments] — use 48+ for round objects
- "cone": [radius, height, segments]
- "torus": [radius, tube, rSeg, tSeg] — use [r, t, 48, 24] for smooth
- "capsule": [radius, length, capSeg, radialSeg] — ideal for limbs, fingers, tubes
- "ring": [innerR, outerR, segments]
- "circle": [radius, segments]
- "plane": [width, height]

═══════════════════════════════════════════════════════════
DESIGN PHILOSOPHY — INDUSTRY-LEVEL REALISM
═══════════════════════════════════════════════════════════

PART COUNT (mandatory minimums by complexity):
- Simple (ball, cup, plate): 25-40 parts
- Medium (chair, lamp, tool): 40-70 parts
- Complex (engine, body, instrument): 70-120 parts

HIERARCHICAL GROUPS (MANDATORY for complex models):
Organize parts into functional sub-assembly GROUPs. Each group = a component users can explore deeper.
- Car → groups: "engine_bay", "cabin_interior", "front_left_door", "rear_trunk", "wheel_FL", etc.
- Human body → groups: "head", "torso", "left_arm", "right_arm", "left_leg", "right_leg"
- Computer → groups: "case", "motherboard", "gpu", "psu", "cooling_system"
Groups define what can be "opened" or "explored" interactively — this is CRITICAL.

ANATOMICAL / MECHANICAL ACCURACY:
- Study the REAL structure before designing. Get proportions right.
- Human: head = 1/7.5 height, shoulders wider than hips, arms reach mid-thigh.
- Vehicles: correct wheelbase, cabin ratio, panel lines, feature placement.
- Machines: correct component sizes and spatial relationships.
- Center at origin. Fit within 2×2×2 unit bounding box.

COMPOSING SHAPES FROM PRIMITIVES:
- Organic curves: stack capsules/spheres with gradual scale changes.
- Flat panels with edges: layered boxes with slight size differences.
- Hollow openings: rings or short cylinders.
- Rounded edges: thin torus at corners.
- Tapered forms: cylinders with different top/bottom radii.
- Panel lines/seams: ultra-thin boxes (0.002 height) overlaid with darker color.
- Buttons/knobs: small cylinders protruding from surfaces.
- Compound curves: overlapping scaled spheres for organic shapes like muscles.

MATERIAL REFERENCE (prefer "physical" for realism):
- Skin: { "type": "physical", "color": "#e8beac", "metalness": 0.0, "roughness": 0.7 }
- Chrome: { "type": "physical", "color": "#c8c8c8", "metalness": 0.95, "roughness": 0.1, "clearcoat": 0.3 }
- Brushed metal: { "type": "physical", "color": "#a0a0a0", "metalness": 0.85, "roughness": 0.35 }
- Car paint: { "type": "physical", "color": "#cc2222", "metalness": 0.4, "roughness": 0.15, "clearcoat": 1.0, "clearcoatRoughness": 0.05 }
- Glass: { "type": "physical", "color": "#aaddff", "metalness": 0.0, "roughness": 0.0, "transparent": true, "opacity": 0.25 }
- Matte plastic: { "type": "standard", "color": "#333", "metalness": 0.0, "roughness": 0.5 }
- Rubber: { "type": "standard", "color": "#1a1a1a", "metalness": 0.0, "roughness": 0.95 }
- Wood: { "type": "standard", "color": "#8B5A2B", "metalness": 0.0, "roughness": 0.85 }
- Bone/ivory: { "type": "standard", "color": "#f5f0e0", "metalness": 0.0, "roughness": 0.6 }
- Leather: { "type": "standard", "color": "#4a3728", "metalness": 0.0, "roughness": 0.75 }
- Ceramic: { "type": "physical", "color": "#f5f5f0", "metalness": 0.0, "roughness": 0.25, "clearcoat": 0.5 }
- Fabric: { "type": "standard", "color": "#556677", "metalness": 0.0, "roughness": 0.95 }

MANDATORY: First part must ALWAYS be:
{ "type": "light", "name": "hover_glow", "lightType": "point", "position": [0,1.2,0], "color": "#ffffff", "intensity": 0, "distance": 4, "animation": { "type": "hover_glow", "hoverIntensity": 0.6, "speed": 3 } }

NEVER: use neon/cartoonish colors, make parts wrong relative size, skip identifying features, use flat planes as stand-ins for 3D shapes.

Return ONLY the JSON object. No markdown, no explanation.\
"""


def _clean_json_response(text: str) -> str:
    """Strip markdown fences and leading/trailing whitespace from LLM output."""
    text = text.strip()
    # Remove ```json ... ``` wrapper
    text = re.sub(r'^```(?:json)?\s*', '', text)
    text = re.sub(r'\s*```$', '', text)
    return text.strip()


@router.post("/model")
async def generate_model(body: GenerateModelRequest):
    """
    Generate a procedural 3D model definition from a natural language description
    using the Poe (Quora) API with OpenAI-compatible chat completions format.
    """
    if not settings.poe_api_key:
        raise HTTPException(
            status_code=500,
            detail="POE_API_KEY not configured. Set it in .env or environment variables.",
        )

    if not body.description or len(body.description.strip()) < 3:
        raise HTTPException(status_code=400, detail="Description too short")

    user_message = (
        f"Create an industry-level detailed procedural 3D model of: {body.description}\n\n"
        f"Build it as if you are recreating a 3D scan from real reference photos. "
        f"Use 50-100+ parts organized in hierarchical GROUPs for functional sub-assemblies. "
        f"Each group should represent a component that could be explored in more detail. "
        f"Use physically accurate materials (physical type with correct metalness/roughness). "
        f"Include ALL visible features: surface details, edges, seams, connectors, labels, hardware. "
        f"Proportions must be anatomically/mechanically correct. "
        f"Return only the JSON object."
    )

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{settings.poe_api_base}/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.poe_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": settings.poe_model,
                    "messages": [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": user_message},
                    ],
                    "temperature": 0.7,
                    "max_tokens": 16384,
                    "stream": False,
                },
            )

            if response.status_code != 200:
                detail = response.text[:500]
                raise HTTPException(
                    status_code=502,
                    detail=f"LLM API returned {response.status_code}: {detail}",
                )

            data = response.json()

            # Handle both OpenAI format and Poe format
            content = None
            if "choices" in data and len(data["choices"]) > 0:
                content = data["choices"][0].get("message", {}).get("content", "")
            elif "text" in data:
                content = data["text"]
            elif isinstance(data, str):
                content = data

            if not content:
                raise HTTPException(
                    status_code=502,
                    detail="No content in LLM response",
                )

            # Parse the JSON from the response
            cleaned = _clean_json_response(content)
            try:
                model_def = json.loads(cleaned)
            except json.JSONDecodeError as e:
                # Try to find JSON object in the response
                json_match = re.search(r'\{[\s\S]*\}', cleaned)
                if json_match:
                    model_def = json.loads(json_match.group())
                else:
                    raise HTTPException(
                        status_code=502,
                        detail=f"Failed to parse LLM output as JSON: {str(e)}",
                    )

            # Validate required fields
            if "slug" not in model_def or "parts" not in model_def:
                raise HTTPException(
                    status_code=502,
                    detail="LLM output missing required fields (slug, parts)",
                )

            # Ensure slug is kebab-case
            model_def["slug"] = re.sub(r'[^a-z0-9-]', '-', model_def["slug"].lower().strip())
            model_def["slug"] = re.sub(r'-+', '-', model_def["slug"]).strip('-')

            if not model_def.get("name"):
                model_def["name"] = body.description[:50]

            return model_def

    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="LLM API request timed out")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation error: {str(e)}")


# ─────────────────── SCENE GENERATION ─────────────────────


class GenerateSceneRequest(BaseModel):
    topic: str


SCENE_SYSTEM_PROMPT = """\
You are an elite 3D scene architect for an immersive, explorable 3D knowledge platform.
You decompose topics into interactive, explorable 3D components — each represented as a detailed object.

CORE CONCEPT: Every scene is a "zoom level" of a topic. Each object represents a MAJOR sub-component
that users can click to explore deeper. Think interactive 3D encyclopedia where you can "open up" anything.

TOPIC DECOMPOSITION STRATEGY:

For PHYSICAL OBJECTS (car, human body, computer, building, machine):
- Decompose into real physical sub-components arranged in their actual spatial relationship.
- Objects should form the recognizable silhouette of the parent topic when viewed together.
- Example "Human Body" → Head, Torso, Left Arm, Right Arm, Left Leg, Right Leg, Spine
- Example "Car" → Body Shell, Engine Bay, Front-Left Door, Dashboard, Trunk, Front Wheels, Rear Wheels
- Example "Desktop Computer" → Tower Case, Monitor, Keyboard, Mouse, GPU, Motherboard, Power Supply

For ABSTRACT TOPICS (science, history, a field of study):
- Create a thematic environment with the most important representative objects.
- Example "Solar System" → Sun, Mercury, Venus, Earth, Mars, Jupiter, Saturn
- Example "Medieval Castle" → Keep, Outer Wall, Drawbridge, Tower, Great Hall, Dungeon

OUTPUT — return ONLY valid JSON (no markdown, no fences):
{
  "scene": {
    "slug": "kebab-case-topic",
    "title": "Display Title",
    "description": "Brief educational description.",
    "zoom_depth": 0,
    "environment": { "ambient_light": 0.5, "fog": null, "hdri": null },
    "camera_defaults": { "position": [10, 8, 10], "target": [0, 1, 0], "fov": 45, "near": 0.1, "far": 1000 }
  },
  "knowledge_nodes": [
    {
      "slug": "unique-slug",
      "title": "Component Name",
      "summary": "Educational summary 2-4 sentences: what it is, function, key facts.",
      "node_type": "object|concept|place|person|event",
      "properties": { "real data: dimensions, weight, function, material, year, etc." },
      "tags": ["tag1", "tag2"]
    }
  ],
  "objects": [
    {
      "label": "Display Label",
      "knowledge_node_slug": "matching-slug",
      "position": [x, y, z],
      "rotation": [0, 0, 0],
      "scale": [1, 1, 1],
      "interaction_type": "popup_info",
      "highlight_color": "#hexcolor"
    }
  ],
  "models": [
    {
      "slug": "model-slug",
      "name": "Model Name",
      "category": "general",
      "description": "What this represents",
      "tags": ["tag1"],
      "default_animation": null,
      "parts": [ ... ]
    }
  ]
}

═══════════════════════════════════════════════════════════
MODEL CONSTRUCTION — INDUSTRY-LEVEL DETAIL
═══════════════════════════════════════════════════════════

Each model = one scene object. Build from primitives to look like the REAL thing.

PART COUNT: 25-70 parts per model. More for complex objects.

Every model MUST start with a hover_glow light:
{ "type": "light", "name": "hover_glow", "lightType": "point", "position": [0,1,0], "color": "#ffffff", "intensity": 0, "distance": 3, "animation": { "type": "hover_glow", "hoverIntensity": 0.5, "speed": 3 } }

Use GROUPs for functional sub-parts within each model:
- A "Head" model → groups: "skull_shape", "face", "hair", "neck"
- An "Engine" model → groups: "block", "intake", "exhaust", "belt_system"
- Groups define what can be explored deeper at the next zoom level.

GEOMETRY TYPES:
- "box": [width, height, depth]
- "sphere": [radius, wSeg, hSeg] — 64,64 for smooth organics
- "cylinder": [rTop, rBot, height, segments] — 48+ for smooth
- "cone": [radius, height, segments]
- "torus": [radius, tube, rSeg, tSeg]
- "capsule": [radius, length, capSeg, radialSeg] — ideal for limbs, tubes
- "ring": [innerR, outerR, segments]
- "circle": [radius, segments]
- "plane": [width, height]

MATERIAL GUIDE:
- Skin: { "type": "physical", "color": "#e8beac", "metalness": 0.0, "roughness": 0.7 }
- Metal/chrome: { "type": "physical", "color": "#b0b0b0", "metalness": 0.9, "roughness": 0.15 }
- Car paint: { "type": "physical", "color": "#cc2222", "metalness": 0.4, "roughness": 0.15, "clearcoat": 1.0 }
- Glass: { "type": "physical", "color": "#aaddff", "transparent": true, "opacity": 0.25, "roughness": 0.0 }
- Plastic: { "type": "standard", "color": "#444", "metalness": 0.0, "roughness": 0.45 }
- Wood: { "type": "standard", "color": "#8B5A2B", "metalness": 0.0, "roughness": 0.85 }
- Rubber: { "type": "standard", "color": "#1a1a1a", "metalness": 0.0, "roughness": 0.95 }
- Bone: { "type": "standard", "color": "#f5f0e0", "metalness": 0.0, "roughness": 0.6 }
- Leather: { "type": "standard", "color": "#4a3728", "metalness": 0.0, "roughness": 0.75 }

COMPOSING SHAPES:
- Organic curves: stacked capsules/spheres with gradual scale changes.
- Flat panels: layered boxes. Seams: ultra-thin dark boxes overlaid.
- Tapered forms: cylinders with different top/bottom radii.
- Rounded edges: thin torus at corners.
- Compound muscle/body curves: overlapping scaled spheres/capsules.

SCENE LAYOUT:
- Spread objects across -6 to +6 on X/Z, 0-4 on Y.
- For physical decompositions: position where they'd be in real life relative to each other.
  Head at [0,3.5,0], Torso at [0,2,0], Arms at [±1.2,2.2,0], Legs at [±0.5,0.5,0]
- Center the composition at origin.
- Use varied highlight_colors.
- Camera should frame all objects: typically [10,8,10] targeting [0,1,0].

KNOWLEDGE NODES:
- Write genuinely educational summaries (2-4 sentences with real facts).
- Include real properties: dimensions, weight, material, function, discovery year.
- Tags should be specific and searchable.

Create 6-12 objects per scene. Each must have matching knowledge_node AND model entries.
Return ONLY the JSON. No markdown, no explanation.\
"""


async def _call_llm(system_prompt: str, user_message: str, max_tokens: int = 8000, retries: int = 2) -> str:
    """Call the Poe API and return the text content, with automatic retries."""
    last_error = None
    for attempt in range(1, retries + 1):
        try:
            logger.info("LLM call attempt %d/%d  model=%s  max_tokens=%d", attempt, retries, settings.poe_model, max_tokens)
            clean_system = system_prompt.strip()
            clean_user = user_message.strip()
            async with httpx.AsyncClient(timeout=300.0) as client:
                response = await client.post(
                    f"{settings.poe_api_base}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {settings.poe_api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": settings.poe_model,
                        "messages": [
                            {"role": "system", "content": clean_system},
                            {"role": "user", "content": clean_user},
                        ],
                        "temperature": 0.7,
                        "max_tokens": max_tokens,
                        "stream": False,
                    },
                )

                if response.status_code != 200:
                    detail = response.text[:500]
                    logger.warning("LLM API returned %d on attempt %d: %s", response.status_code, attempt, detail)
                    # Retry on 429 (rate-limit) or 5xx server errors
                    if response.status_code in (429, 500, 502, 503) and attempt < retries:
                        import asyncio
                        await asyncio.sleep(2 * attempt)
                        last_error = f"LLM API returned {response.status_code}: {detail}"
                        continue
                    raise HTTPException(
                        status_code=502,
                        detail=f"LLM API returned {response.status_code}: {detail}",
                    )

                data = response.json()

                content = None
                if "choices" in data and len(data["choices"]) > 0:
                    content = data["choices"][0].get("message", {}).get("content", "")
                elif "text" in data:
                    content = data["text"]
                elif isinstance(data, str):
                    content = data

                if not content:
                    logger.warning("Empty LLM response on attempt %d, keys=%s", attempt, list(data.keys()) if isinstance(data, dict) else type(data))
                    if attempt < retries:
                        import asyncio
                        await asyncio.sleep(2)
                        last_error = "No content in LLM response"
                        continue
                    raise HTTPException(status_code=502, detail="No content in LLM response")

                logger.info("LLM call succeeded on attempt %d, response length=%d", attempt, len(content))
                return content

        except httpx.TimeoutException:
            logger.warning("LLM timeout on attempt %d", attempt)
            if attempt < retries:
                import asyncio
                await asyncio.sleep(2 * attempt)
                last_error = "LLM API request timed out"
                continue
            raise HTTPException(status_code=504, detail="LLM API request timed out after retries")
        except HTTPException:
            raise
        except Exception as e:
            logger.exception("Unexpected error in _call_llm attempt %d", attempt)
            last_error = str(e)
            if attempt < retries:
                import asyncio
                await asyncio.sleep(2)
                continue
            raise

    raise HTTPException(status_code=502, detail=f"LLM call failed after {retries} attempts: {last_error}")


def _fix_json(text: str) -> str:
    """Attempt to fix common JSON syntax errors produced by LLMs."""
    # Remove trailing commas before } or ]  (e.g.  {"a": 1,} )
    text = re.sub(r',\s*([}\]])', r'\1', text)
    # Remove single-line // comments (outside strings — best-effort)
    text = re.sub(r'//[^\n]*', '', text)
    # Fix missing commas between properties:  "value"\n  "key":  →  "value",\n  "key":
    text = re.sub(
        r'(\")\s*\n(\s*\")',
        r'\1,\n\2',
        text,
    )
    # Fix missing commas:  }\n  { or ]\n  [ or }\n  " or ]\n  "  etc.
    text = re.sub(r'(\})\s*\n(\s*\{)', r'\1,\n\2', text)
    text = re.sub(r'(\])\s*\n(\s*\[)', r'\1,\n\2', text)
    text = re.sub(r'(\})\s*\n(\s*\")', r'\1,\n\2', text)
    text = re.sub(r'(\])\s*\n(\s*\")', r'\1,\n\2', text)
    # Fix: number or true/false/null followed by newline then "key":
    text = re.sub(r'(\d)\s*\n(\s*\")', r'\1,\n\2', text)
    text = re.sub(r'(true|false|null)\s*\n(\s*\")', r'\1,\n\2', text)
    # Clean trailing commas one more time
    text = re.sub(r',\s*([}\]])', r'\1', text)
    return text


def _close_truncated_json(text: str) -> str:
    """Close unclosed brackets/braces in truncated JSON, respecting nesting order."""
    # Strip trailing garbage after last complete value
    # Remove trailing incomplete string literal
    text = re.sub(r',\s*"[^"]*$', '', text)
    # Remove trailing comma
    text = re.sub(r',\s*$', '', text)
    # Walk through to figure out the nesting stack
    stack = []
    in_string = False
    escape = False
    for ch in text:
        if escape:
            escape = False
            continue
        if ch == '\\' and in_string:
            escape = True
            continue
        if ch == '"':
            in_string = not in_string
            continue
        if in_string:
            continue
        if ch in ('{', '['):
            stack.append('}' if ch == '{' else ']')
        elif ch in ('}', ']'):
            if stack and stack[-1] == ch:
                stack.pop()
    # Close in reverse order
    return text + ''.join(reversed(stack))


def _parse_json(text: str) -> dict:
    """Parse JSON from LLM output, stripping markdown fences and fixing common errors."""
    cleaned = _clean_json_response(text)

    # 1. Try direct parse
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    # 2. Extract outermost { ... } and try
    json_match = re.search(r'\{[\s\S]*\}', cleaned)
    raw = json_match.group() if json_match else cleaned

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass

    # 3. Apply fixes and retry
    fixed = _fix_json(raw)
    try:
        return json.loads(fixed)
    except json.JSONDecodeError:
        pass

    # 4. Truncated JSON — the LLM may have hit max_tokens mid-object.
    repaired = _close_truncated_json(fixed)
    # Clean trailing commas one more time
    repaired = re.sub(r',\s*([}\]])', r'\1', repaired)

    try:
        return json.loads(repaired)
    except json.JSONDecodeError:
        pass

    # 5. Last resort — apply fixes on the full cleaned text (not just {…} extraction)
    fixed_full = _close_truncated_json(_fix_json(cleaned))
    fixed_full = re.sub(r',\s*([}\]])', r'\1', fixed_full)
    try:
        return json.loads(fixed_full)
    except json.JSONDecodeError as exc:
        logger.error("JSON repair failed at char %d: %s\n--- first 500 chars ---\n%s",
                      exc.pos or 0, exc.msg, repaired[:500])
        raise HTTPException(
            status_code=502,
            detail=f"Failed to parse LLM output as JSON: {exc.msg} at position {exc.pos}",
        )


def _slugify(text: str) -> str:
    """Convert text to a clean kebab-case slug."""
    slug = re.sub(r'[^a-z0-9-]', '-', text.lower().strip())
    return re.sub(r'-+', '-', slug).strip('-')


def _sanitize_animation(value):
    """Ensure default_animation is a dict or None.

    LLMs sometimes return a bare string like 'rotate' instead of the
    expected ``{"type": "rotate", ...}`` dict.  This helper normalises
    such values so Pydantic validation won't fail.
    """
    if value is None:
        return None
    if isinstance(value, dict):
        return value
    if isinstance(value, str) and value.strip():
        return {"type": value.strip()}
    return None


def _sanitize_list(value, default=None):
    """Ensure value is a list. Wrap strings/scalars, flatten bad types."""
    if default is None:
        default = []
    if value is None:
        return default
    if isinstance(value, list):
        return value
    if isinstance(value, str):
        return [value] if value.strip() else default
    return default


def _sanitize_dict(value, default=None):
    """Ensure value is a dict."""
    if default is None:
        default = {}
    if isinstance(value, dict):
        return value
    return default


def _sanitize_vec(value, length=3, default_val=0):
    """Ensure value is a list of floats with the expected length."""
    default = [default_val] * length
    if not isinstance(value, (list, tuple)):
        return default
    try:
        result = [float(v) for v in value[:length]]
        while len(result) < length:
            result.append(default_val)
        return result
    except (TypeError, ValueError):
        return default


# Stop-words to ignore when computing topic relativity
_STOP_WORDS = {
    'a', 'an', 'the', 'of', 'in', 'on', 'at', 'to', 'for', 'and', 'or', 'is',
    'it', 'by', 'with', 'from', 'as', 'this', 'that', 'are', 'was', 'be', 'has',
    'its', 'into', 'about', 'scene', 'inside', 'through', 'view',
}


def _extract_keywords(text: str) -> set[str]:
    """Extract meaningful lowercase keywords from text, ignoring stop-words."""
    words = set(re.findall(r'[a-z]{2,}', text.lower()))
    return words - _STOP_WORDS


def _relativity_score(
    new_title: str,
    new_description: str,
    new_tags: list[str],
    existing_title: str,
    existing_description: str,
    existing_tags: list[str],
) -> float:
    """Score how related a new scene is to an existing one (0-1)."""
    new_kw = _extract_keywords(f"{new_title} {new_description}")
    new_kw.update(t.lower() for t in new_tags)

    exist_kw = _extract_keywords(f"{existing_title} {existing_description}")
    exist_kw.update(t.lower() for t in existing_tags)

    if not new_kw or not exist_kw:
        return 0.0

    # Jaccard-like overlap, weighted towards the smaller set
    overlap = new_kw & exist_kw
    if not overlap:
        return 0.0

    # Score = overlap / min_set_size  (gives higher score when smaller set is well-covered)
    score = len(overlap) / min(len(new_kw), len(exist_kw))
    return score


async def _find_best_parent_scene(
    topic: str,
    new_title: str,
    new_description: str,
    new_tags: list[str],
) -> tuple[Scene | None, float]:
    """
    Search all existing scenes and return the most topically-related one as parent.
    Returns (parent_scene, score).  Returns (None, 0) if nothing scores above threshold.
    """
    all_scenes = await Scene.find_all().to_list()
    if not all_scenes:
        return None, 0.0

    best_scene = None
    best_score = 0.0
    THRESHOLD = 0.15  # minimum relativity to assign as child

    for scene in all_scenes:
        # Gather tags from the scene's objects
        scene_tags = []
        for obj in scene.objects:
            label_words = obj.label.lower().split()
            scene_tags.extend(label_words)
            if obj.model_slug:
                scene_tags.append(obj.model_slug.replace('-', ' '))

        # Also pull tags from knowledge nodes linked to this scene
        kn_ids = [obj.knowledge_node_id for obj in scene.objects if obj.knowledge_node_id]
        if kn_ids:
            from bson import ObjectId
            valid_ids = []
            for kid in kn_ids:
                try:
                    valid_ids.append(ObjectId(kid))
                except Exception:
                    pass
            if valid_ids:
                kn_nodes = await KnowledgeNode.find(
                    {"_id": {"$in": valid_ids}}
                ).to_list()
                for kn in kn_nodes:
                    scene_tags.extend(kn.tags)

        score = _relativity_score(
            new_title, new_description, new_tags,
            scene.title, scene.description, scene_tags,
        )

        if score > best_score:
            best_score = score
            best_scene = scene

    if best_score >= THRESHOLD:
        return best_scene, best_score
    return None, 0.0


@router.post("/scene")
async def generate_scene(body: GenerateSceneRequest):
    """
    Generate a complete scene from a topic using AI.
    Creates knowledge nodes, 3D models, and a scene with objects — all saved to the database.
    Returns the scene slug so the frontend can navigate to it.
    """
    if not settings.poe_api_key:
        raise HTTPException(
            status_code=500,
            detail="POE_API_KEY not configured. Set it in .env or environment variables.",
        )

    topic = body.topic.strip()
    if len(topic) < 2:
        raise HTTPException(status_code=400, detail="Topic too short")

    # Check if a scene with a similar slug already exists
    candidate_slug = _slugify(topic)
    existing = await Scene.find_one(Scene.slug == candidate_slug)
    if existing:
        return {
            "status": "exists",
            "slug": existing.slug,
            "title": existing.title,
            "message": f"A scene for '{existing.title}' already exists.",
        }

    user_message = (
        f"Create a complete, industry-level detailed 3D scene about: {topic}\n\n"
        f"DECOMPOSE this topic into 6-12 major interactive sub-components. "
        f"If it's a physical object (body, car, machine), break it into its real parts arranged spatially. "
        f"If it's an abstract topic, create the most important representative objects. "
        f"Each object needs a detailed procedural model (25-70 parts) using groups for sub-assemblies. "
        f"The models must look like REAL objects — correct proportions, realistic materials (physical type), accurate colors. "
        f"Position objects so they form the recognizable shape of the topic when viewed together. "
        f"Write genuinely educational knowledge summaries with real-world properties. "
        f"Return only the JSON object."
    )

    try:
        content = await _call_llm(SCENE_SYSTEM_PROMPT, user_message, max_tokens=8000)
        scene_data = _parse_json(content)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Scene generation error for topic=%s", topic)
        raise HTTPException(status_code=500, detail=f"Scene generation error: {str(e)}")

    # Validate top-level structure
    if "scene" not in scene_data or "objects" not in scene_data:
        raise HTTPException(
            status_code=502,
            detail="LLM output missing required fields (scene, objects)",
        )

    scene_def = scene_data["scene"]
    kn_defs = scene_data.get("knowledge_nodes", [])
    obj_defs = scene_data.get("objects", [])
    model_defs = scene_data.get("models", [])

    # Ensure unique slug
    scene_slug = _slugify(scene_def.get("slug", topic))
    existing = await Scene.find_one(Scene.slug == scene_slug)
    if existing:
        scene_slug = scene_slug + "-" + uuid.uuid4().hex[:6]

    # --- Save knowledge nodes ---
    kn_map = {}  # slug → knowledge node id
    for kn in kn_defs:
        kn_slug = _slugify(kn.get("slug", kn.get("title", "")))
        if not kn_slug:
            continue
        # Skip if a node with this slug already exists
        existing_kn = await KnowledgeNode.find_one(KnowledgeNode.slug == kn_slug)
        if existing_kn:
            kn_map[kn_slug] = str(existing_kn.id)
            continue
        node = KnowledgeNode(
            slug=kn_slug,
            title=kn.get("title", kn_slug),
            summary=kn.get("summary", ""),
            node_type=kn.get("node_type", "object"),
            properties=_sanitize_dict(kn.get("properties"), {}),
            tags=_sanitize_list(kn.get("tags"), []),
        )
        await node.insert()
        kn_map[kn_slug] = str(node.id)

    # --- Save 3D models ---
    model_slug_map = {}  # slug → saved slug (in case of conflict)
    for mdef in model_defs:
        m_slug = _slugify(mdef.get("slug", mdef.get("name", "")))
        if not m_slug or not mdef.get("parts"):
            continue
        existing_model = await Model3D.find_one(Model3D.slug == m_slug)
        if existing_model:
            model_slug_map[mdef.get("slug", m_slug)] = m_slug
            continue
        try:
            model = Model3D(
                slug=m_slug,
                name=mdef.get("name", m_slug),
                category=mdef.get("category", "ai-generated"),
                parts=_sanitize_list(mdef.get("parts"), []),
                default_animation=_sanitize_animation(mdef.get("default_animation")),
                description=str(mdef.get("description", "")),
                tags=_sanitize_list(mdef.get("tags"), []),
            )
            await model.insert()
            model_slug_map[mdef.get("slug", m_slug)] = m_slug
        except Exception as e:
            logger.warning("Skipping model '%s' due to validation error: %s", m_slug, e)
            continue

    # --- Build scene objects ---
    scene_objects = []
    for obj in obj_defs:
        obj_id = str(uuid.uuid4())
        kn_slug = _slugify(obj.get("knowledge_node_slug", ""))
        kn_id = kn_map.get(kn_slug)

        # Find matching model slug
        model_slug = None
        label_slug = _slugify(obj.get("label", ""))
        # Try direct match from model_slug_map
        for orig_slug, saved_slug in model_slug_map.items():
            if _slugify(orig_slug) == label_slug or _slugify(orig_slug) == kn_slug:
                model_slug = saved_slug
                break
        # Fallback: try matching by similar name
        if not model_slug:
            for orig_slug, saved_slug in model_slug_map.items():
                if label_slug in _slugify(orig_slug) or _slugify(orig_slug) in label_slug:
                    model_slug = saved_slug
                    break
        # Last resort: use the first available model
        if not model_slug and model_slug_map:
            # Try to match by index
            idx = len(scene_objects) % len(model_slug_map)
            model_slug = list(model_slug_map.values())[idx]

        pos = _sanitize_vec(obj.get("position", [0, 1, 0]))
        rot = _sanitize_vec(obj.get("rotation", [0, 0, 0]))
        scale = _sanitize_vec(obj.get("scale", [1, 1, 1]), default_val=1)

        try:
            scene_objects.append(SceneObject(
                id=obj_id,
                knowledge_node_id=kn_id,
                label=str(obj.get("label", "Object")),
                model_slug=model_slug,
                transform={"position": pos, "rotation": rot, "scale": scale},
                interaction_type=obj.get("interaction_type", "popup_info"),
                highlight_color=obj.get("highlight_color", "#667788"),
            ))
        except Exception as e:
            logger.warning("Skipping object '%s' due to validation error: %s", obj.get('label'), e)
            continue

    # --- Create and save the scene ---
    cam = scene_def.get("camera_defaults", {})
    env = scene_def.get("environment", {})

    # --- Find the best parent scene by topic relativity ---
    new_title = scene_def.get("title", topic)
    new_description = scene_def.get("description", f"An AI-generated scene about {topic}")
    all_new_tags = []
    for kn in kn_defs:
        all_new_tags.extend(kn.get("tags", []))
    # Also add topic words as tags
    all_new_tags.extend(re.findall(r'[a-zA-Z]{2,}', topic.lower()))

    parent_scene, rel_score = await _find_best_parent_scene(
        topic, new_title, new_description, all_new_tags,
    )

    parent_scene_id = str(parent_scene.id) if parent_scene else None
    zoom_depth = (parent_scene.zoom_depth + 1) if parent_scene else 0

    scene = Scene(
        slug=scene_slug,
        title=new_title,
        description=new_description,
        parent_scene_id=parent_scene_id,
        zoom_depth=zoom_depth,
        environment={
            "ambient_light": env.get("ambient_light", 0.4),
            "fog": env.get("fog"),
            "hdri": env.get("hdri"),
        },
        camera_defaults={
            "position": cam.get("position", [8, 6, 8]),
            "target": cam.get("target", [0, 1, 0]),
            "fov": cam.get("fov", 50),
            "near": cam.get("near", 0.1),
            "far": cam.get("far", 1000),
        },
        objects=scene_objects,
    )
    await scene.insert()

    # --- Link the new scene into the parent (add a zoom_into object) ---
    parent_slug = None
    if parent_scene:
        # Pick the first available model slug from the new scene, or None
        link_model_slug = list(model_slug_map.values())[0] if model_slug_map else None

        # Find a free position in the parent scene to place the link object
        used_positions = [
            (o.transform.get("position", [0, 0, 0])[0],
             o.transform.get("position", [0, 0, 0])[2])
            for o in parent_scene.objects
        ]
        # Pick a spot that doesn't collide with existing objects
        import math
        n = len(parent_scene.objects)
        angle = (n * 0.8) % (2 * math.pi)
        radius = 3.0 + (n * 0.5)
        px = round(radius * math.cos(angle), 2)
        pz = round(radius * math.sin(angle), 2)

        link_object = SceneObject(
            id=str(uuid.uuid4()),
            label=new_title,
            model_slug=link_model_slug,
            transform={"position": [px, 0.5, pz], "rotation": [0, 0, 0], "scale": [1, 1, 1]},
            interaction_type="zoom_into",
            zoom_target_scene_id=str(scene.id),
            highlight_color="#00ccff",
        )
        parent_scene.objects.append(link_object)
        await parent_scene.save()
        parent_slug = parent_scene.slug

    return {
        "status": "created",
        "slug": scene.slug,
        "title": scene.title,
        "description": scene.description,
        "object_count": len(scene_objects),
        "model_count": len(model_slug_map),
        "knowledge_node_count": len(kn_map),
        "parent_scene_slug": parent_slug,
        "relativity_score": round(rel_score, 3),
    }


class RebuildSceneRequest(BaseModel):
    slug: str


@router.post("/scene/rebuild")
async def rebuild_scene(body: RebuildSceneRequest):
    """
    Rebuild an existing scene by deleting it (and its models/knowledge nodes) and regenerating.
    Preserves parent-child relationships.
    """
    if not settings.poe_api_key:
        raise HTTPException(status_code=500, detail="POE_API_KEY not configured.")

    slug = body.slug.strip()
    existing = await Scene.find_one(Scene.slug == slug)
    if not existing:
        raise HTTPException(status_code=404, detail=f"Scene '{slug}' not found")

    # Remember the topic (title) and parent info before deleting
    topic = existing.title
    parent_scene_id = existing.parent_scene_id

    # Collect model slugs and knowledge node IDs to clean up
    model_slugs_to_delete = set()
    kn_ids_to_delete = set()
    for obj in existing.objects:
        if obj.model_slug:
            model_slugs_to_delete.add(obj.model_slug)
        if obj.knowledge_node_id:
            kn_ids_to_delete.add(obj.knowledge_node_id)

    # Delete the scene
    await existing.delete()

    # Delete associated models (only AI-generated ones, check they aren't used by other scenes)
    for ms in model_slugs_to_delete:
        model = await Model3D.find_one(Model3D.slug == ms)
        if model:
            # Check no other scene uses this model
            other = await Scene.find_one({"objects.model_slug": ms})
            if not other:
                await model.delete()

    # Delete knowledge nodes that aren't used by other scenes
    if kn_ids_to_delete:
        from beanie import PydanticObjectId
        for kid_str in kn_ids_to_delete:
            try:
                kid = PydanticObjectId(kid_str)
            except Exception:
                continue
            other = await Scene.find_one({"objects.knowledge_node_id": kid_str})
            if not other:
                kn = await KnowledgeNode.get(kid)
                if kn:
                    await kn.delete()

    # Remove link objects in parent scene that pointed to this scene
    if parent_scene_id:
        try:
            from beanie import PydanticObjectId
            parent = await Scene.get(PydanticObjectId(parent_scene_id))
            if parent:
                parent.objects = [
                    o for o in parent.objects
                    if o.zoom_target_scene_id != str(existing.id)
                ]
                await parent.save()
        except Exception:
            pass

    # Now regenerate using the same topic
    gen_result = await generate_scene(GenerateSceneRequest(topic=topic))
    gen_result["status"] = "rebuilt"
    return gen_result


class RefineSceneRequest(BaseModel):
    slug: str
    feedback: str  # User description of what to fix/change


REFINE_SYSTEM_PROMPT = """\
You are an elite 3D scene editor for an immersive educational knowledge platform.
Given an EXISTING scene (JSON) and user feedback, output a COMPLETE REVISED scene JSON.

CRITICAL: You MUST make meaningful, visible changes to the scene based on the feedback.
If the user asks for "accuracy", "realism", or "detail" — you must REBUILD every model
with significantly more parts, better proportions, and physically correct materials.
Do NOT return the scene unchanged. The user expects to SEE a difference.

You may and should:
- Redesign model parts completely (fix proportions, add much more detail, improve materials)
- Add 30-60% more parts to each model for realism
- Reposition, add, or remove objects for better spatial layout
- Modify geometry, materials, colors for any model part
- Update knowledge node summaries with richer educational content
- Adjust camera and environment for better presentation

QUALITY STANDARDS (apply to ALL output):
- Models: 30-70 parts minimum, composed from primitives to look like real objects.
- Use hierarchical GROUPs for functional sub-assemblies within models.
- Materials: physically accurate (correct metalness/roughness for material type, use "physical" type for metals/glass).
- Proportions: anatomically/mechanically correct.
- Every model starts with a hover_glow light part.
- No cartoonish colors — realistic palettes only.
- When asked for realism: add surface details, bevels, seams, screws, labels, small imperfections.

GEOMETRY TYPES:
- "box": [w, h, d] | "sphere": [r, wSeg, hSeg] — 64,64 smooth
- "cylinder": [rTop, rBot, h, seg] — 48+ smooth | "cone": [r, h, seg]
- "torus": [r, tube, rSeg, tSeg] | "capsule": [r, len, capSeg, radSeg]
- "ring": [inner, outer, seg] | "circle": [r, seg] | "plane": [w, h]

MATERIAL REFERENCE:
- Metal: metalness 0.85-1.0, roughness 0.1-0.3, type "physical"
- Glass: transparent, opacity 0.25, roughness 0.0, type "physical"
- Plastic: metalness 0.0, roughness 0.4-0.6
- Skin: #e8beac, metalness 0.0, roughness 0.7
- Wood: metalness 0.0, roughness 0.85 | Rubber: metalness 0.0, roughness 0.95

Output the COMPLETE revised scene JSON. Every model must be fully defined with all parts.
Do NOT abbreviate or skip parts. No markdown, no explanation — ONLY the JSON object.\
"""


@router.post("/scene/refine")
async def refine_scene(body: RefineSceneRequest):
    """
    Refine an existing scene based on user feedback.
    Sends the current scene data + feedback to the LLM, then replaces the scene.
    """
    if not settings.poe_api_key:
        raise HTTPException(status_code=500, detail="POE_API_KEY not configured.")

    slug = body.slug.strip()
    feedback = body.feedback.strip()
    if len(feedback) < 3:
        raise HTTPException(status_code=400, detail="Feedback too short")

    existing = await Scene.find_one(Scene.slug == slug)
    if not existing:
        raise HTTPException(status_code=404, detail=f"Scene '{slug}' not found")

    # Build a compact representation of the current scene for the LLM
    current_objects = []
    model_slugs_set = set()
    kn_ids_set = set()
    for obj in existing.objects:
        current_objects.append({
            "label": obj.label,
            "position": obj.transform.get("position", [0, 0, 0]),
            "rotation": obj.transform.get("rotation", [0, 0, 0]),
            "scale": obj.transform.get("scale", [1, 1, 1]),
            "interaction_type": obj.interaction_type,
            "highlight_color": obj.highlight_color,
            "model_slug": obj.model_slug,
            "knowledge_node_slug": None,  # filled below
        })
        if obj.model_slug:
            model_slugs_set.add(obj.model_slug)
        if obj.knowledge_node_id:
            kn_ids_set.add(obj.knowledge_node_id)

    # Fetch knowledge nodes
    kn_map_existing = {}
    kn_defs_existing = []
    if kn_ids_set:
        from beanie import PydanticObjectId
        nodes = await KnowledgeNode.find(
            {"_id": {"$in": [PydanticObjectId(k) for k in kn_ids_set]}}
        ).to_list()
        for n in nodes:
            kn_map_existing[str(n.id)] = n
            kn_defs_existing.append({
                "slug": n.slug,
                "title": n.title,
                "summary": n.summary,
                "node_type": n.node_type,
                "properties": n.properties,
                "tags": n.tags,
            })

    # Map knowledge_node_slug into objects
    for i, obj in enumerate(existing.objects):
        if obj.knowledge_node_id and obj.knowledge_node_id in kn_map_existing:
            current_objects[i]["knowledge_node_slug"] = kn_map_existing[obj.knowledge_node_id].slug

    # Fetch model definitions — send compact summaries (not all parts) to save tokens
    model_defs_existing = []
    if model_slugs_set:
        model_docs = await Model3D.find(
            {"slug": {"$in": list(model_slugs_set)}}
        ).to_list()
        for m in model_docs:
            # Summarise parts: just type/name + geometry type for context
            parts_summary = []
            for p in (m.parts or [])[:5]:  # first 5 parts as sample
                parts_summary.append({
                    "type": p.get("type"),
                    "name": p.get("name", ""),
                    "geometry": p.get("geometry"),
                })
            model_defs_existing.append({
                "slug": m.slug,
                "name": m.name,
                "category": m.category,
                "description": m.description,
                "tags": m.tags,
                "default_animation": m.default_animation,
                "total_parts": len(m.parts or []),
                "parts_sample": parts_summary,
            })

    current_scene_json = json.dumps({
        "scene": {
            "slug": existing.slug,
            "title": existing.title,
            "description": existing.description,
            "zoom_depth": existing.zoom_depth,
            "environment": existing.environment,
            "camera_defaults": existing.camera_defaults,
        },
        "knowledge_nodes": kn_defs_existing,
        "objects": current_objects,
        "models": model_defs_existing,
    }, indent=2)

    user_message = (
        f"Here is the CURRENT scene definition:\n\n{current_scene_json}\n\n"
        f"USER FEEDBACK: {feedback}\n\n"
        f"IMPORTANT: You must make real, visible changes based on the feedback above. "
        f"Rebuild every model from scratch with full detail (30-70 parts each). "
        f"The models section above only shows summaries — you must output COMPLETE new model definitions. "
        f"Keep the same slug '{slug}'. Return ONLY the complete JSON object."
    )

    try:
        content = await _call_llm(REFINE_SYSTEM_PROMPT, user_message, max_tokens=8000)
        scene_data = _parse_json(content)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Refine error for slug=%s", slug)
        raise HTTPException(status_code=500, detail=f"Refine error: {str(e)}")

    if "scene" not in scene_data or "objects" not in scene_data:
        raise HTTPException(status_code=502, detail="LLM output missing required fields")

    scene_def = scene_data["scene"]
    kn_defs = scene_data.get("knowledge_nodes", [])
    obj_defs = scene_data.get("objects", [])
    model_defs = scene_data.get("models", [])

    # --- Delete old models that will be replaced ---
    old_model_slugs = model_slugs_set.copy()

    # --- Save/update knowledge nodes ---
    kn_map = {}
    for kn in kn_defs:
        kn_slug = _slugify(kn.get("slug", kn.get("title", "")))
        if not kn_slug:
            continue
        existing_kn = await KnowledgeNode.find_one(KnowledgeNode.slug == kn_slug)
        if existing_kn:
            # Update existing node
            existing_kn.summary = kn.get("summary", existing_kn.summary)
            existing_kn.node_type = kn.get("node_type", existing_kn.node_type)
            existing_kn.properties = _sanitize_dict(kn.get("properties"), existing_kn.properties)
            existing_kn.tags = _sanitize_list(kn.get("tags"), existing_kn.tags)
            await existing_kn.save()
            kn_map[kn_slug] = str(existing_kn.id)
        else:
            node = KnowledgeNode(
                slug=kn_slug,
                title=kn.get("title", kn_slug),
                summary=kn.get("summary", ""),
                node_type=kn.get("node_type", "object"),
                properties=_sanitize_dict(kn.get("properties"), {}),
                tags=_sanitize_list(kn.get("tags"), []),
            )
            await node.insert()
            kn_map[kn_slug] = str(node.id)

    # --- Save/update 3D models ---
    new_model_slugs = set()
    model_slug_map = {}
    for mdef in model_defs:
        m_slug = _slugify(mdef.get("slug", mdef.get("name", "")))
        if not m_slug or not mdef.get("parts"):
            continue
        new_model_slugs.add(m_slug)
        existing_model = await Model3D.find_one(Model3D.slug == m_slug)
        if existing_model:
            # Update the model in-place
            existing_model.parts = _sanitize_list(mdef.get("parts"), existing_model.parts)
            existing_model.name = mdef.get("name", existing_model.name)
            existing_model.description = str(mdef.get("description", existing_model.description))
            existing_model.default_animation = _sanitize_animation(mdef.get("default_animation"))
            existing_model.tags = _sanitize_list(mdef.get("tags"), existing_model.tags)
            await existing_model.save()
            model_slug_map[mdef.get("slug", m_slug)] = m_slug
        else:
            try:
                model = Model3D(
                    slug=m_slug,
                    name=mdef.get("name", m_slug),
                    category=mdef.get("category", "ai-generated"),
                    parts=_sanitize_list(mdef.get("parts"), []),
                    default_animation=_sanitize_animation(mdef.get("default_animation")),
                    description=str(mdef.get("description", "")),
                    tags=_sanitize_list(mdef.get("tags"), []),
                )
                await model.insert()
                model_slug_map[mdef.get("slug", m_slug)] = m_slug
            except Exception as e:
                logger.warning("Skipping model '%s' in refine due to validation error: %s", m_slug, e)
                continue

    # Delete old models no longer used
    for old_ms in old_model_slugs - new_model_slugs:
        old_model = await Model3D.find_one(Model3D.slug == old_ms)
        if old_model:
            other = await Scene.find_one(
                {"objects.model_slug": old_ms, "slug": {"$ne": slug}}
            )
            if not other:
                await old_model.delete()

    # --- Build scene objects ---
    scene_objects = []
    for obj in obj_defs:
        obj_id = str(uuid.uuid4())
        kn_slug = _slugify(obj.get("knowledge_node_slug", ""))
        kn_id = kn_map.get(kn_slug)

        model_slug = None
        label_slug = _slugify(obj.get("label", ""))
        for orig_slug, saved_slug in model_slug_map.items():
            if _slugify(orig_slug) == label_slug or _slugify(orig_slug) == kn_slug:
                model_slug = saved_slug
                break
        if not model_slug:
            for orig_slug, saved_slug in model_slug_map.items():
                if label_slug in _slugify(orig_slug) or _slugify(orig_slug) in label_slug:
                    model_slug = saved_slug
                    break
        if not model_slug and model_slug_map:
            idx = len(scene_objects) % len(model_slug_map)
            model_slug = list(model_slug_map.values())[idx]

        # Preserve zoom_target links from old objects with the same label
        zoom_target = None
        interaction = obj.get("interaction_type", "popup_info")
        for old_obj in existing.objects:
            if old_obj.label == obj.get("label") and old_obj.zoom_target_scene_id:
                zoom_target = old_obj.zoom_target_scene_id
                interaction = "zoom_into"
                break

        pos = _sanitize_vec(obj.get("position", [0, 1, 0]))
        rot = _sanitize_vec(obj.get("rotation", [0, 0, 0]))
        scale = _sanitize_vec(obj.get("scale", [1, 1, 1]), default_val=1)

        try:
            scene_objects.append(SceneObject(
                id=obj_id,
                knowledge_node_id=kn_id,
                label=str(obj.get("label", "Object")),
                model_slug=model_slug,
                transform={"position": pos, "rotation": rot, "scale": scale},
                interaction_type=interaction,
                zoom_target_scene_id=zoom_target,
                highlight_color=obj.get("highlight_color", "#667788"),
            ))
        except Exception as e:
            logger.warning("Skipping object '%s' in refine due to validation error: %s", obj.get('label'), e)
            continue

    # --- Update the existing scene in-place ---
    cam = scene_def.get("camera_defaults", existing.camera_defaults)
    env = scene_def.get("environment", existing.environment)

    existing.title = scene_def.get("title", existing.title)
    existing.description = scene_def.get("description", existing.description)
    existing.environment = {
        "ambient_light": env.get("ambient_light", 0.4),
        "fog": env.get("fog"),
        "hdri": env.get("hdri"),
    }
    existing.camera_defaults = {
        "position": cam.get("position", [8, 6, 8]),
        "target": cam.get("target", [0, 1, 0]),
        "fov": cam.get("fov", 50),
        "near": cam.get("near", 0.1),
        "far": cam.get("far", 1000),
    }
    existing.objects = scene_objects
    await existing.save()

    return {
        "status": "refined",
        "slug": existing.slug,
        "title": existing.title,
        "description": existing.description,
        "object_count": len(scene_objects),
        "model_count": len(model_slug_map),
    }
