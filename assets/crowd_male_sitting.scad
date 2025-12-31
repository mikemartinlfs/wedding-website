/*
crowd_male_sitting.scad
Generic, cartoon-simple seated person. No chair included.
Units: mm

How to export STL:
1) Open in OpenSCAD
2) Press F6 (Render)
3) File -> Export -> Export as STL

Recommended:
- Print height: 18–30mm (scale uniformly)
- 0.2mm layer height, 2–3 perimeters
*/

$fn = 36;

// ---------- parameters ----------
scale_mm = 1.0;          // uniform scale multiplier
base_thickness = 0.8;    // tiny underside raft-like base for stability (set 0 to remove)

// Overall proportions
hip_w = 9.0;
hip_d = 6.5;
torso_w = 8.0;
torso_d = 5.5;
torso_h = 12.0;

head_r = 4.0;
neck_r = 1.7;
neck_h = 2.0;

arm_r = 1.35;
leg_r = 1.65;

// Pose / angles
back_lean_deg = 10;      // torso lean back
knee_bend_deg = 75;      // knee bend (approx)
elbow_bend_deg = 60;

// Seat pose measurements
seat_height = 9.0;       // height of hips from ground
thigh_len = 7.5;
shin_len = 7.0;
foot_len = 4.5;

upperarm_len = 6.0;
forearm_len = 5.5;

// ---------- helpers ----------
module capsule(r, h){
    // "pill" shape: cylinder + hemispheres
    union(){
        cylinder(r=r, h=h);
        translate([0,0,0]) sphere(r=r);
        translate([0,0,h]) sphere(r=r);
    }
}

module limb_segment(r, len){
    // oriented along +X by default
    rotate([0,90,0]) capsule(r, len);
}

module person_male(){
    // origin at ground center under hips
    union(){
        // Optional micro-base (helps tiny prints stick)
        if(base_thickness > 0)
            translate([0,0,base_thickness/2])
                cube([22,18,base_thickness], center=true);

        // Hips block (rounded)
        translate([0,0,seat_height])
            minkowski(){
                cube([hip_w, hip_d, 5.0], center=true);
                sphere(r=1.2);
            }

        // Torso (slightly tapered)
        translate([0,0,seat_height+5.0])
            rotate([back_lean_deg,0,0])
            translate([0,0,torso_h/2])
            minkowski(){
                cube([torso_w, torso_d, torso_h], center=true);
                sphere(r=1.1);
            }

        // Neck
        translate([0,0,seat_height+5.0])
            rotate([back_lean_deg,0,0])
            translate([0,0,torso_h + neck_h/2])
            cylinder(r=neck_r, h=neck_h, center=true);

        // Head
        translate([0,0,seat_height+5.0])
            rotate([back_lean_deg,0,0])
            translate([0,0,torso_h + neck_h + head_r*0.95])
            sphere(r=head_r);

        // Legs (two)
        for(side=[-1,1]){
            x_off = side*(hip_w*0.32);

            // Thigh: from hip forward
            translate([x_off, 0, seat_height+1.0])
                translate([0, hip_d*0.15, 0])
                rotate([0,0,0])
                limb_segment(leg_r, thigh_len);

            // Shin: from knee down
            translate([x_off + thigh_len, hip_d*0.15, seat_height+1.0])
                rotate([0, -knee_bend_deg, 0])
                limb_segment(leg_r*0.95, shin_len);

            // Foot (simple wedge)
            translate([x_off + thigh_len + shin_len*cos(knee_bend_deg), hip_d*0.15, seat_height+1.0 - shin_len*sin(knee_bend_deg)])
                translate([foot_len/2, 0, -leg_r*0.2])
                scale([1.0,0.65,0.45])
                sphere(r=leg_r*1.7);
        }

        // Arms (two) hanging a bit forward
        for(side=[-1,1]){
            y_sh = -torso_d*0.55;
            x_sh = side*(torso_w*0.55);
            z_sh = seat_height+5.0 + 8.5;

            // Upper arm
            translate([x_sh,y_sh,z_sh])
                rotate([0, 35, 0])
                limb_segment(arm_r, upperarm_len);

            // Forearm
            translate([x_sh + upperarm_len*cos(35), y_sh, z_sh - upperarm_len*sin(35)])
                rotate([0, 35 + elbow_bend_deg, 0])
                limb_segment(arm_r*0.95, forearm_len);

            // Hand blob
            translate([x_sh + upperarm_len*cos(35) + forearm_len*cos(35+elbow_bend_deg),
                       y_sh,
                       z_sh - upperarm_len*sin(35) - forearm_len*sin(35+elbow_bend_deg)])
                scale([0.9,0.75,0.6])
                sphere(r=arm_r*2.0);
        }
    }
}

// ---------- build ----------
scale([scale_mm, scale_mm, scale_mm])
person_male();
