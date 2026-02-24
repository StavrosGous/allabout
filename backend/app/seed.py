"""Seed the database with a showcase Solar System scene demonstrating the platform."""
import asyncio
import uuid
from app.core.database import init_db
from app.models.knowledge_node import KnowledgeNode
from app.models.scene import Scene, SceneObject
from app.models.model3d import Model3D


# ─── Helper to build planet models ─────────────────────────────────

def _planet_model(slug, name, radius, color, metalness=0.0, roughness=0.4,
                  ring=None, glow_color="#ffffff", extras=None):
    """Generate a procedural planet model with surface detail."""
    parts = [
        {
            "type": "light", "name": "hover_glow", "lightType": "point",
            "position": [0, radius + 0.5, 0], "color": glow_color,
            "intensity": 0, "distance": radius * 4,
            "animation": {"type": "hover_glow", "hoverIntensity": 0.6, "speed": 3},
        },
        {
            "type": "mesh", "name": "core_sphere",
            "geometry": {"type": "sphere", "args": [radius, 64, 64]},
            "material": {"type": "physical", "color": color, "metalness": metalness, "roughness": roughness},
            "position": [0, 0, 0], "castShadow": True,
        },
    ]
    if ring:
        parts.append({
            "type": "mesh", "name": "ring",
            "geometry": {"type": "ring", "args": [ring["inner"], ring["outer"], 64]},
            "material": {"type": "physical", "color": ring["color"], "metalness": 0.1, "roughness": 0.5,
                         "transparent": True, "opacity": 0.7, "side": "double"},
            "position": [0, 0, 0], "rotation": [1.3, 0, 0], "castShadow": True,
        })
    if extras:
        parts.extend(extras)
    return {
        "slug": slug, "name": name, "category": "astronomy",
        "description": f"Procedural model of {name}",
        "tags": ["planet", "solar-system", "astronomy"],
        "default_animation": {"type": "rotate", "axis": "y", "speed": 0.08},
        "parts": parts,
    }


def _sun_model():
    """Build a detailed Sun model with corona and surface detail."""
    return {
        "slug": "sun", "name": "The Sun", "category": "astronomy",
        "description": "Our star — a G-type main-sequence star",
        "tags": ["star", "solar-system"],
        "default_animation": {"type": "rotate", "axis": "y", "speed": 0.02},
        "parts": [
            {"type": "light", "name": "hover_glow", "lightType": "point",
             "position": [0, 1.5, 0], "color": "#ffaa00", "intensity": 0, "distance": 6,
             "animation": {"type": "hover_glow", "hoverIntensity": 1.0, "speed": 3}},
            {"type": "light", "name": "sun_light", "lightType": "point",
             "position": [0, 0, 0], "color": "#fff5e0", "intensity": 2.0, "distance": 20},
            {"type": "mesh", "name": "core",
             "geometry": {"type": "sphere", "args": [0.8, 64, 64]},
             "material": {"type": "standard", "color": "#ffcc00", "emissive": "#ff8800",
                          "emissiveIntensity": 1.5, "metalness": 0.0, "roughness": 0.3},
             "position": [0, 0, 0], "castShadow": False},
            {"type": "mesh", "name": "corona_inner",
             "geometry": {"type": "sphere", "args": [0.85, 32, 32]},
             "material": {"type": "standard", "color": "#ffaa00", "emissive": "#ff6600",
                          "emissiveIntensity": 0.8, "transparent": True, "opacity": 0.3, "side": "double"},
             "position": [0, 0, 0]},
            {"type": "mesh", "name": "corona_outer",
             "geometry": {"type": "sphere", "args": [0.95, 32, 32]},
             "material": {"type": "standard", "color": "#ff8800", "emissive": "#ff4400",
                          "emissiveIntensity": 0.4, "transparent": True, "opacity": 0.15, "side": "double"},
             "position": [0, 0, 0]},
            # Sunspots
            {"type": "mesh", "name": "sunspot_1",
             "geometry": {"type": "circle", "args": [0.08, 16]},
             "material": {"type": "standard", "color": "#cc6600", "emissive": "#993300",
                          "emissiveIntensity": 0.3},
             "position": [0.3, 0.5, 0.55], "rotation": [0.3, 0.5, 0]},
            {"type": "mesh", "name": "sunspot_2",
             "geometry": {"type": "circle", "args": [0.06, 16]},
             "material": {"type": "standard", "color": "#cc6600", "emissive": "#993300",
                          "emissiveIntensity": 0.3},
             "position": [-0.4, 0.2, 0.6], "rotation": [-0.2, -0.4, 0]},
        ],
    }


def _earth_model():
    """Build a detailed Earth model with atmosphere, continents hinted, ice caps."""
    return {
        "slug": "earth", "name": "Earth", "category": "astronomy",
        "description": "Our home planet — third from the Sun",
        "tags": ["planet", "solar-system", "earth"],
        "default_animation": {"type": "rotate", "axis": "y", "speed": 0.1},
        "parts": [
            {"type": "light", "name": "hover_glow", "lightType": "point",
             "position": [0, 0.8, 0], "color": "#4488ff", "intensity": 0, "distance": 4,
             "animation": {"type": "hover_glow", "hoverIntensity": 0.6, "speed": 3}},
            # Ocean surface
            {"type": "mesh", "name": "ocean",
             "geometry": {"type": "sphere", "args": [0.45, 64, 64]},
             "material": {"type": "physical", "color": "#1a5276", "metalness": 0.1, "roughness": 0.3},
             "position": [0, 0, 0], "castShadow": True},
            # Land masses (slightly raised spheres)
            {"type": "group", "name": "continents", "position": [0, 0, 0], "children": [
                {"type": "mesh", "name": "continent_1",
                 "geometry": {"type": "sphere", "args": [0.12, 16, 16]},
                 "material": {"type": "standard", "color": "#2d6a2d", "metalness": 0.0, "roughness": 0.8},
                 "position": [0.2, 0.3, 0.2], "scale": [1.4, 0.8, 1.2]},
                {"type": "mesh", "name": "continent_2",
                 "geometry": {"type": "sphere", "args": [0.1, 16, 16]},
                 "material": {"type": "standard", "color": "#3a7a3a", "metalness": 0.0, "roughness": 0.8},
                 "position": [-0.15, 0.25, 0.3], "scale": [1.6, 0.6, 1.0]},
                {"type": "mesh", "name": "continent_3",
                 "geometry": {"type": "sphere", "args": [0.15, 16, 16]},
                 "material": {"type": "standard", "color": "#2d6a2d", "metalness": 0.0, "roughness": 0.85},
                 "position": [0.1, -0.1, 0.38], "scale": [1.2, 0.7, 0.8]},
                {"type": "mesh", "name": "continent_4",
                 "geometry": {"type": "sphere", "args": [0.08, 16, 16]},
                 "material": {"type": "standard", "color": "#3a7a3a", "metalness": 0.0, "roughness": 0.8},
                 "position": [-0.3, 0.0, 0.28], "scale": [1.0, 1.2, 0.8]},
            ]},
            # Ice caps
            {"type": "group", "name": "ice_caps", "position": [0, 0, 0], "children": [
                {"type": "mesh", "name": "north_pole",
                 "geometry": {"type": "sphere", "args": [0.12, 16, 8]},
                 "material": {"type": "physical", "color": "#f0f5ff", "metalness": 0.1, "roughness": 0.2},
                 "position": [0, 0.42, 0], "scale": [1.5, 0.3, 1.5]},
                {"type": "mesh", "name": "south_pole",
                 "geometry": {"type": "sphere", "args": [0.1, 16, 8]},
                 "material": {"type": "physical", "color": "#e8f0ff", "metalness": 0.1, "roughness": 0.2},
                 "position": [0, -0.42, 0], "scale": [1.3, 0.3, 1.3]},
            ]},
            # Atmosphere
            {"type": "mesh", "name": "atmosphere",
             "geometry": {"type": "sphere", "args": [0.48, 48, 48]},
             "material": {"type": "physical", "color": "#87ceeb", "transparent": True, "opacity": 0.08,
                          "metalness": 0.0, "roughness": 0.0, "side": "double"},
             "position": [0, 0, 0]},
            # Cloud layer
            {"type": "mesh", "name": "clouds",
             "geometry": {"type": "sphere", "args": [0.465, 32, 32]},
             "material": {"type": "standard", "color": "#ffffff", "transparent": True, "opacity": 0.15,
                          "side": "double"},
             "position": [0, 0, 0],
             "animation": {"type": "rotate", "axis": "y", "speed": 0.04}},
        ],
    }


# ─── Knowledge nodes ──────────────────────────────────

KNOWLEDGE_NODES = [
    {"slug": "sun", "title": "The Sun",
     "summary": "The Sun is a G-type main-sequence star (G2V) at the center of the Solar System. It accounts for 99.86% of the total mass of the Solar System and provides the energy that sustains life on Earth through nuclear fusion of hydrogen into helium.",
     "node_type": "object",
     "properties": {"mass_kg": "1.989 × 10³⁰", "radius_km": 696340, "surface_temp_K": 5778, "age_years": "4.6 billion", "spectral_type": "G2V"},
     "tags": ["star", "solar-system", "astronomy", "nuclear-fusion"]},
    {"slug": "mercury", "title": "Mercury",
     "summary": "Mercury is the smallest planet and closest to the Sun. Despite its proximity to the Sun, it is not the hottest planet — that title belongs to Venus. Mercury has virtually no atmosphere and its surface is heavily cratered.",
     "node_type": "object",
     "properties": {"mass_kg": "3.301 × 10²³", "radius_km": 2439.7, "orbital_period_days": 87.97, "distance_from_sun_AU": 0.387, "moons": 0},
     "tags": ["planet", "inner-planet", "solar-system"]},
    {"slug": "venus", "title": "Venus",
     "summary": "Venus is the second planet from the Sun and the hottest in the Solar System due to its thick CO₂ atmosphere creating a runaway greenhouse effect. It rotates in the opposite direction to most planets.",
     "node_type": "object",
     "properties": {"mass_kg": "4.867 × 10²⁴", "radius_km": 6051.8, "surface_temp_C": 462, "orbital_period_days": 224.7, "moons": 0},
     "tags": ["planet", "inner-planet", "solar-system", "greenhouse"]},
    {"slug": "earth", "title": "Earth",
     "summary": "Earth is the third planet from the Sun and the only known celestial body to harbor life. About 71% of its surface is covered by water. It has one natural satellite, the Moon, which stabilizes its axial tilt.",
     "node_type": "object",
     "properties": {"mass_kg": "5.972 × 10²⁴", "radius_km": 6371, "surface_temp_C": "−89 to 57", "orbital_period_days": 365.25, "moons": 1, "atmosphere": "78% N₂, 21% O₂"},
     "tags": ["planet", "inner-planet", "solar-system", "life", "water"]},
    {"slug": "mars", "title": "Mars",
     "summary": "Mars is the fourth planet from the Sun, known as the Red Planet due to iron oxide on its surface. It hosts Olympus Mons, the tallest volcano in the Solar System, and Valles Marineris, a vast canyon system.",
     "node_type": "object",
     "properties": {"mass_kg": "6.417 × 10²³", "radius_km": 3389.5, "surface_temp_C": "−87 to −5", "orbital_period_days": 687, "moons": 2},
     "tags": ["planet", "inner-planet", "solar-system", "mars-rovers"]},
    {"slug": "jupiter", "title": "Jupiter",
     "summary": "Jupiter is the largest planet in the Solar System — a gas giant with a mass more than 2.5 times all other planets combined. Its Great Red Spot is a storm larger than Earth that has raged for at least 350 years.",
     "node_type": "object",
     "properties": {"mass_kg": "1.898 × 10²⁷", "radius_km": 69911, "orbital_period_years": 11.86, "moons": 95, "great_red_spot": "storm > 16,000 km wide"},
     "tags": ["planet", "gas-giant", "solar-system", "jupiter"]},
    {"slug": "saturn", "title": "Saturn",
     "summary": "Saturn is the sixth planet from the Sun, famous for its spectacular ring system made primarily of ice particles with rocky debris. It is the least dense planet — it would float in water if there were an ocean large enough.",
     "node_type": "object",
     "properties": {"mass_kg": "5.683 × 10²⁶", "radius_km": 58232, "orbital_period_years": 29.46, "moons": 146, "ring_system": "primarily ice and rock"},
     "tags": ["planet", "gas-giant", "solar-system", "rings"]},
    {"slug": "uranus", "title": "Uranus",
     "summary": "Uranus is an ice giant with the coldest atmosphere of any planet (−224°C). It rotates on its side with an axial tilt of 97.77°, likely caused by a massive ancient collision.",
     "node_type": "object",
     "properties": {"mass_kg": "8.681 × 10²⁵", "radius_km": 25362, "orbital_period_years": 84.01, "moons": 28, "axial_tilt_degrees": 97.77},
     "tags": ["planet", "ice-giant", "solar-system"]},
    {"slug": "neptune", "title": "Neptune",
     "summary": "Neptune is the most distant planet from the Sun — a dark, cold ice giant with the strongest winds in the Solar System reaching 2,100 km/h. It was the first planet found by mathematical prediction.",
     "node_type": "object",
     "properties": {"mass_kg": "1.024 × 10²⁶", "radius_km": 24622, "orbital_period_years": 164.8, "moons": 16, "wind_speed_kmh": 2100},
     "tags": ["planet", "ice-giant", "solar-system"]},
]


async def seed():
    await init_db()

    # Clear existing data
    await KnowledgeNode.delete_all()
    await Scene.delete_all()
    await Model3D.delete_all()
    print("  ✓ Cleared existing data")

    # Insert knowledge nodes
    node_map = {}
    for kn_data in KNOWLEDGE_NODES:
        node = KnowledgeNode(**kn_data)
        await node.insert()
        node_map[node.slug] = node
        print(f"  ✓ Knowledge node: {node.title}")

    # ─── Build 3D models ─────────────────────────────────────

    sun_model = _sun_model()
    earth_model_def = _earth_model()

    planet_defs = [
        ("mercury", "Mercury", 0.15, "#a0a0a0", 0.2, 0.6),
        ("venus", "Venus", 0.35, "#e8c06a", 0.0, 0.5),
        ("mars", "Mars", 0.25, "#c1440e", 0.0, 0.65),
        ("jupiter", "Jupiter", 0.7, "#c8a55a", 0.0, 0.45),
        ("saturn", "Saturn", 0.6, "#e8d5a0", 0.0, 0.4),
        ("uranus", "Uranus", 0.4, "#7ec8e3", 0.0, 0.3),
        ("neptune", "Neptune", 0.38, "#3355aa", 0.0, 0.35),
    ]

    all_models = [sun_model, earth_model_def]
    for slug, name, r, color, met, rough in planet_defs:
        extras = []
        ring = None
        if slug == "saturn":
            ring = {"inner": r + 0.15, "outer": r + 0.45, "color": "#d4c090"}
        if slug == "jupiter":
            # Add Great Red Spot
            extras.append({
                "type": "mesh", "name": "great_red_spot",
                "geometry": {"type": "sphere", "args": [0.12, 16, 16]},
                "material": {"type": "standard", "color": "#cc4422", "metalness": 0.0, "roughness": 0.6},
                "position": [0.5, -0.1, 0.35], "scale": [1.4, 0.6, 1.0],
            })
            # Cloud bands
            for i, y in enumerate([-0.3, -0.1, 0.15, 0.35]):
                extras.append({
                    "type": "mesh", "name": f"band_{i}",
                    "geometry": {"type": "torus", "args": [0.68 - abs(y) * 0.3, 0.015, 48, 48]},
                    "material": {"type": "standard",
                                 "color": "#b8944a" if i % 2 == 0 else "#d4b87a",
                                 "metalness": 0.0, "roughness": 0.5},
                    "position": [0, y, 0], "rotation": [1.5708, 0, 0],
                })
        if slug == "mars":
            # Polar ice cap
            extras.append({
                "type": "mesh", "name": "north_cap",
                "geometry": {"type": "sphere", "args": [0.06, 16, 8]},
                "material": {"type": "physical", "color": "#f0f5ff", "metalness": 0.1, "roughness": 0.2},
                "position": [0, 0.23, 0], "scale": [1.3, 0.3, 1.3],
            })
            extras.append({
                "type": "mesh", "name": "olympus_mons",
                "geometry": {"type": "cone", "args": [0.04, 0.03, 16]},
                "material": {"type": "standard", "color": "#a83808", "metalness": 0.0, "roughness": 0.8},
                "position": [0.15, 0.1, 0.15],
            })
        if slug == "uranus":
            ring = {"inner": r + 0.08, "outer": r + 0.15, "color": "#5599aa"}
        all_models.append(_planet_model(slug, name, r, color, met, rough, ring=ring,
                                        extras=extras if extras else None))

    # Save all models
    for mdef in all_models:
        m = Model3D(**mdef)
        await m.insert()
        print(f"  ✓ 3D model: {m.name}")

    # ─── Create Solar System scene ────────────────────────────

    # Positions: roughly spaced by distance from sun
    planet_positions = {
        "sun": [0, 0, 0],
        "mercury": [2.0, 0, 0.5],
        "venus": [3.2, 0, -1.0],
        "earth": [4.5, 0, 0.8],
        "mars": [5.8, 0, -0.5],
        "jupiter": [-3.0, 0, -3.5],
        "saturn": [-5.5, 0, -1.5],
        "uranus": [2.5, 0, -4.5],
        "neptune": [5.0, 0, -4.0],
    }

    highlight_colors = {
        "sun": "#ffaa00", "mercury": "#aaaaaa", "venus": "#e8c06a",
        "earth": "#4488ff", "mars": "#cc4422", "jupiter": "#ddb87a",
        "saturn": "#e8d5a0", "uranus": "#7ec8e3", "neptune": "#3355dd",
    }

    solar_scene = Scene(
        slug="solar-system",
        title="The Solar System",
        description="Our cosmic neighborhood — the Sun and its eight planets. Click any celestial body to learn more, or Go Deeper to explore its composition.",
        zoom_depth=0,
        environment={"ambient_light": 0.15, "fog": None, "hdri": None},
        camera_defaults={"position": [8, 10, 12], "target": [0, 0, -1], "fov": 50, "near": 0.1, "far": 1000},
        objects=[],
    )
    await solar_scene.insert()

    objects = []
    for slug, kn in node_map.items():
        objects.append(SceneObject(
            id=str(uuid.uuid4()),
            knowledge_node_id=str(kn.id),
            label=kn.title,
            model_slug=slug,
            transform={
                "position": planet_positions.get(slug, [0, 0, 0]),
                "rotation": [0, 0, 0],
                "scale": [1, 1, 1],
            },
            interaction_type="popup_info",
            highlight_color=highlight_colors.get(slug, "#ffffff"),
        ))

    solar_scene.objects = objects
    await solar_scene.save()

    print(f"\n✓ Seeded {len(KNOWLEDGE_NODES)} knowledge nodes")
    print(f"✓ Seeded 1 scene (Solar System)")
    print(f"✓ Seeded {len(all_models)} 3D models")
    print(f"\nPlatform ready! Generate new scenes via AI to explore any topic.")


if __name__ == "__main__":
    asyncio.run(seed())
